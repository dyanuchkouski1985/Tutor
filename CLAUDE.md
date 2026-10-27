# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A vocabulary-learning app ("Tutor"): users build a personal word list (English / Polish), then drill it through
exercises that advance a per-word learning progress and feed a daily statistics percentage.

Three deployable pieces, no shared code between them:

| Piece | Stack | Dev URL |
| --- | --- | --- |
| [Frontend/](Frontend/) — SPA | Angular 22 (standalone components, own UI kit on Angular CDK, `angular-oauth2-oidc`) | `http://localhost:4200` |
| [Backend/Api/](Backend/Api/) — resource server | ASP.NET Core 10, EF Core, SQL Server | `https://localhost:7151` (`/swagger`) |
| [Backend/Identity/](Backend/Identity/) — OIDC provider | ASP.NET Core 10, ASP.NET Identity + OpenIddict 7, Razor Pages | `https://localhost:7008` |

Both backends point at the **same** SQL Server database (`Tutor` on `(localdb)\MSSQLLocalDB` in Development) through
two independent `DbContext`s — `TutorContext` (domain) and `ApplicationDbContext` (Identity + OpenIddict tables).

## Commands

### Backend

```powershell
dotnet build Backend/Tutor.sln
dotnet run --project Backend/Identity      # start first — Api validates tokens against it
dotnet run --project Backend/Api
```

Both must run together; [Backend/Tutor.slnLaunch.user](Backend/Tutor.slnLaunch.user) is the Visual Studio
multi-project startup profile that does this.

Domain schema changes are EF migrations that are **not applied at startup** — run them by hand:

```powershell
dotnet ef migrations add <Name> --project Backend/Api
dotnet ef database update --project Backend/Api
```

`ApplicationDbContext` has migrations too, but `ClientsConfigHostedService` calls `EnsureCreatedAsync()` on startup
instead, so Identity tables appear automatically on a fresh database (and the Identity migrations are effectively
unused unless the DB already exists).

### Frontend

```powershell
cd Frontend
npm start                                       # ng serve on :4200
npm run build                                   # production build to dist/
npm run format                                  # prettier over src/
npm test                                        # karma + jasmine (needs Chrome)
npx ng test --include=src/app/app.spec.ts --watch=false --browsers=ChromeHeadless   # single spec
```

There is only one spec in the repo ([app.spec.ts](Frontend/src/app/app.spec.ts), the CLI scaffold) — there is no
established frontend test suite to follow.

### Known broken tool path

**ESLint does not run**: [eslint.config.js](Frontend/eslint.config.js) requires `@typescript-eslint/*` and
`@angular-eslint/*`, none of which are installed. The `npx eslint ...` lines in
[Frontend/README.md](Frontend/README.md) only work after adding those dev dependencies. Use
`npx ng build --configuration development` as the type check.

## Architecture

### Auth: sub claim → security context → service constructor

1. The SPA runs OIDC authorization-code + PKCE against Identity as client `tutor-client`, scopes
   `openid profile email api offline_access` ([auth.service.ts](Frontend/src/app/services/auth.service.ts)).
2. [JwtInterceptor](Frontend/src/app/core/interceptors/jwt.interceptor.ts) attaches the bearer token plus an
   `X-Timezone-Offset` header to every request, and re-triggers login on 401. `AuthService.login()` starts at most
   one redirect per page and no sooner than 15 s after the previous one (timestamp in `sessionStorage`), so a token
   the Api keeps rejecting turns into a slow retry instead of an endless `?code=…&iss=…` redirect loop.
   `logout()` clears that timestamp, otherwise the redirect back from Identity waits out the rest of the 15 s.
3. Api validates the JWT with `Authority = IdentityEndpoint`, `ValidAudience = "api"`, issuer validation **off**
   ([Api/Auth/ServiceCollectionExtensions.cs](Backend/Api/Auth/ServiceCollectionExtensions.cs)). The inbound claim-type
   map is cleared, so claims stay short (`sub`, `email` — see [ClaimTypes.cs](Backend/Api/Infrastructure/ClaimTypes.cs)).
   `RefreshInterval` is 10 s instead of the default 5 min: Identity's signing keys are ephemeral, and with the default
   the Api kept rejecting fresh tokens for up to 5 minutes after Identity restarted.
4. `SecurityContextMiddleware` pushes `HttpContext.User` into the scoped `SecurityContextProvider`; business services
   read it through `ISecurityContext`.

**Consequence worth remembering:** every business service captures the user in a *property initializer*, e.g.
`private Guid userId { get; } = Guid.Parse(securityContext.GetCurrentUserId());`. Resolving such a service on an
unauthenticated request throws at construction time. That is why `PicturesController` (anonymous, still TODO-flagged)
uses `PictureService`, the one service with no `ISecurityContext` dependency, and why `UseSecurityContext()` must stay
after `UseAuthentication()` in [Program.cs](Backend/Api/Program.cs).

Token renewal uses **refresh tokens**, not iframe silent refresh: `setupAutomaticSilentRefresh()` only reaches
`refreshToken()` while `useSilentRefresh` stays absent/false and `responseType` is `'code'`
([refreshInternal](Frontend/node_modules/angular-oauth2-oidc/fesm2022/angular-oauth2-oidc.mjs)). Setting
`useSilentRefresh: true` silently switches back to a hidden iframe with `prompt=none`, which needs a dedicated renew
page and third-party cookies to Identity — don't reintroduce it.

OpenIddict signing/encryption keys are **ephemeral** (`AddEphemeralEncryptionKey` / `AddEphemeralSigningKey`), so every
Identity restart invalidates existing tokens. Access-token encryption is disabled so the Api can read the JWT.

### Data model: shared word catalog, per-user selection rows

`Word`, `Translation`, `Picture`, `Usage` are **global** rows shared by all users. Ownership and ordering live entirely
in the join tables `UserTranslation`, `UserPicture`, `UserUsage` (each with `UserId` + `Position`), plus
`UserWordLearningProgress` for state. Practical rules that fall out of this, repeated by queries throughout the Api:

- "The user's words" always means `Translations.Any(t => t.UserTranslations.Any(ut => ut.UserId == userId))`.
- Ordering of translations / pictures / usages comes from the *join row's* `Position`, never from the global row.
- `WordTranslationsService.PutAsync` treats `Enabled` on each incoming translation/picture/usage as "user owns this":
  enabled-but-unowned adds a join row, owned-but-disabled deletes one, then positions are renumbered from 0. The same
  call can attach a global row another user already created.
- `DeleteAsync` removes only the caller's join rows — the global `Word` and its content survive for other users.
- `DateOnly` properties are mapped through `DateOnlyConverter` to SQL `date` via `ConfigureConventions`.

### Learning-progress state machine

`WordLearningProgress` (`Others=-1, None=0, One, Two, Three, Paused=4, Completed=5`) decides which exercise a word is
eligible for, and each exercise mutates it differently:

- **TranslationsWord** and **Crossword** only ever see `None..Three`. `TranslationsWordExerciseService.PutAsync`
  increments on a correct answer (capped at `Three`), decrements on a wrong one (floored at `None`), and awards
  statistics points that *decrease* with progress (7/6/5/3), minus 3 if the user asked for help.
- **RepeatPausedWords** only sees `Paused` (last learned more than 14 days ago) and `Completed` (more than 100 days) —
  see [GeneralConstants.cs](Backend/Api/Constants/GeneralConstants.cs). A wrong answer resets the word all the way back
  to `Two`; every second correct answer of the day is worth `RepeatWordsCorrectAnswerPoints` (1). Answers arrive one
  at a time, so the pending half point is kept in `UserStatistic.HasRepeatHalfPoint`.
- `Paused` / `Completed` are never reached by an exercise — the user sets them explicitly through the word-translations
  dialog (`PutWordTranslationsRequest.WordLearningProgress`).

Every word exercise saves each answer as it is given — the frontend sends a one-item list to the same
`Put` endpoints and refreshes `UserStatisticsService` straight after — so an abandoned exercise keeps what was
answered, and reloading cannot replay a task the user just failed. Crossword checks a word only when the learner
clicks the check icon, which appears in the free cell after the highlighted word (before it at the board edge) once
all its letters are in; nothing is checked automatically. A wrong word shows the right letters, and its cells lock
either way (shared cells help the crossing word). "Complete" settles only the words still open.

Every statistics source finds today's row through `TutorContext.GetOrCreateTodayStatisticAsync`
([UserStatisticExtensions.cs](Backend/Api/Models/UserStatisticExtensions.cs)) — it owns the `DateTime.Now` day
expression, which must keep matching `UserStatisticsService`'s read path, since `(UserId, Language, Date)` has no
unique index to stop a divergent expression quietly creating a second row for the same day.

Exercise popularity is a 0/1 per exercise per day: `UserExerciseCompletions` (`UserId, Language, Date, Exercise`, unique)
gets a row the first time that day an exercise reaches its end, and repeats change nothing. The frontend posts
`api/ExerciseCompletions` through `ExerciseCompletionsService.markCompleted` where each exercise plays its finish sound
(RepeatPausedWords: after the last answer); conversations are marked server-side on any learner message. The date comes
from `UserStatisticExtensions.Today()`, the same expression as the daily statistic. Abandoned runs leave nothing.
`GET api/ExerciseCompletions/Summary` (months like the calendar, `isAllUsers` sums every user's days) feeds the
"Exercises" view of the Activity dialog (`ExercisePopularityComponent`): one bar per exercise, "32% · 9 days" for Mine and
only "32%" for Everyone (summed days mean nothing there), the bar scaled to the leading exercise. English-only exercises are left out for Polish.

Each word exercise has a minimum word count and is blocked below it: TranslationsWord 6
(`WordTranslationsExerciseWordsCount`), RepeatPausedWords 10, Crossword 8 single words not
learned today and shorter than the board (`CrosswordMinWordsCount`), Guess 3 `One..Three` words (`GuessExerciseWordsCount`), Explain 3 with the same filter
(`ExplainExerciseWordsCount`). Each exercise service owns a `CountAvailableWordsAsync` that mirrors its
selection filter; `UserStatisticsService` turns those into `IsAvailable*Exercise` flags, which the home dock uses to
disable icons and `ExerciseResultComponent` (via `availabilityFlag`) uses to disable "Repeat". The GET endpoints
enforce the same minimum themselves (empty list / empty crossword), and the frontend then shows
`ExerciseUnavailableComponent` — so keep a count method in step with its exercise query when changing either.

Exercise word selection is a cascade, not a single query: `TranslationsWordExerciseService.GetAsync` fills its 6-word
slot list by trying `Three` (max 2), then `Two`, `One`, `None`, then `Three` again until the count is met. Within each
level the least recently learned word goes first (`LastLearningDate`, then `AddingDate`; a new word's
`LastLearningDate` equals its `AddingDate`, and editing a word bumps it), and `Two` also skips words learned today.
The Tomorrow words preview (`GetTomorrowAsync`) runs the same cascade dated tomorrow, back to back, and drops the
`Three` words each run brings (they need no preview) until it has `TomorrowWordsCount` (12) words, so it must stay
on this code path rather than its own query.
`CrosswordExerciseService` is a board-packing algorithm (12x12, targets 4 horizontal + 4 vertical words, gives up when
an iteration adds nothing).

### Exercises

Each exercise below keeps its details (points, prompts, hints, answer keys, edge cases) in its own file under
[docs/exercises/](docs/exercises/). **Read that file before changing the exercise, and update it in the same change.**

| Exercise | Route | Backend service | Notes |
| --- | --- | --- | --- |
| Conversations | `/speech-exercise` | `ConversationService` | [conversations.md](docs/exercises/conversations.md) |
| SentenceTranslation | `/sentence-translation-exercise` | `SentenceTranslationService` | [sentence-translation.md](docs/exercises/sentence-translation.md) |
| Guess | `/guess-exercise` | `GuessService` | [guess.md](docs/exercises/guess.md) |
| Explain | `/explain-exercise` | `ExplainService` | [explain.md](docs/exercises/explain.md) |
| Listening | `/listening-exercise` | `ListeningService` | [listening.md](docs/exercises/listening.md) |
| Countability ("Much or many") | `/countability-exercise` | `CountabilityService` | [countability.md](docs/exercises/countability.md) |
| VerbForms | `/verb-forms-exercise` | `VerbFormsService` | [verb-forms.md](docs/exercises/verb-forms.md) |
| Articles | `/articles-exercise` | `ArticlesService` | [articles.md](docs/exercises/articles.md) |

Patterns several of them share:
- **AI-written, word-free** (Conversations, SentenceTranslation, Listening, Countability, VerbForms, Articles): no
  learning progress and no minimum word count; points are capped per day only where the file says so, through a
  `UserStatistic.*Percentage` counter.
- **Stateless answer key** (Listening, Countability, VerbForms, Articles): the check data travels to the client in a
  time-limited ASP.NET Data Protection `Key`, and an `IMemoryCache` entry makes a resubmit worth 0. Countability and
  Articles share `GapChoiceServiceBase` and the frontend `GapChoiceExerciseComponent`.
- **English only** (Listening, Countability, VerbForms, Articles): the home dock hides their icons for Polish by
  checking the current language, not the `IsAvailable*` flags, so they don't flash in while statistics load.
- **Mistakes drill**: SentenceTranslation, Countability, VerbForms, Articles and conversations feed it through
  `TutorContext.RecordMistakesAsync` / `GetKnownMistakeRulesAsync`
  ([UserMistakeExtensions.cs](Backend/Api/Models/UserMistakeExtensions.cs)).

### Learner level (CEFR)

`UserLanguageSetting` holds one `LanguageLevel` (`A1=1 .. C2=6`) per user per language; a missing row means
`GeneralConstants.DefaultLanguageLevel` (B1), so rows are only written when the user picks a level. The only place to
change it is the level badge next to the language flag on the home page (`GET/PUT api/LanguageSettings`). There is
deliberately **no** per-conversation or per-exercise level: every AI service that writes text for the learner reads it
server-side through `ILanguageSettingsService.GetLevelAsync(language)` at call time and passes it into the prompt,
which describes it with the shared `AiServiceBase.DescribeLevel`. It currently shapes conversation scene generation,
AI lines and message grading (word-choice strictness only — grammar is always reported, points are unchanged),
sentence-translation sentence length and difficulty, mistake-drill sentences, listening scenes, and suggested word
usages. Answer
checks and translation suggestions ignore it.

### Api layering conventions

`Controllers/` (thin, `[Authorize]` + primary-constructor injection) -> `Interfaces/Services/` -> `Services/BusinessLogic/`.
`Requests/` holds inbound DTOs, `Representations/` outbound ones (`Representations/Common/Page.cs` for paging). All DI
and pipeline wiring lives in per-concern `ServiceCollectionExtensions` / `ApplicationBuilderExtensions` static classes
under `Auth/`, `Cors/`, `Swagger/`, `Infrastructure/` — register new services in
[Infrastructure/ServiceCollectionExtensions.cs](Backend/Api/Infrastructure/ServiceCollectionExtensions.cs)
(`AddBusinessServices`), not in `Program.cs`.

OpenAPI is generated by `AddOpenApi` with a document transformer that adds the `oauth2` scheme and applies it to every
operation *except* those marked `[AllowAnonymous]`; Swashbuckle is used only for the UI shell
([Swagger/ApplicationBuilderExtensions.cs](Backend/Api/Swagger/ApplicationBuilderExtensions.cs)).

`WordTranslationsService` fetches missing pronunciations from the external `api.soundoftext.com` service (Google voice
`en-GB` / `pl-PL`) and stores the mp3 bytes on `Word.PronunciationData`; failures are swallowed. Audio and images are
served as raw bytes from `WordPronunciationController` / `PicturesController`.

### Frontend conventions

- Angular 22 needs Node `^22.22.3` or `^24.15` and TypeScript 6.0. The v22 update migration put
  `changeDetection: ChangeDetectionStrategy.Eager` on every component to keep pre-22 change detection (v22 defaults
  to OnPush); new components should do the same unless they are written for OnPush.
- Standalone components only; files are named without a `.component.` infix (`home.ts`, `home.html`, `home.scss`) while
  classes keep the `Component` suffix (`@angular-eslint/component-class-suffix` is set to `error`). `ThemeSwitcher` is
  the one class that predates the rule.
- Routes in [app.routes.ts](Frontend/src/app/app.routes.ts) are lazy (`loadComponent`) except `HomeComponent`, and
  `PreloadAllModules` fetches the rest in the background after start. All are guarded by `AuthGuard`, which
  waits on `isDoneLoading$` and kicks off a login redirect rather than returning a redirect route. `/test` is the
  exception — unguarded, and it renders a quiz from a **hard-coded JSON import** that is swapped by editing the import
  line in [test.ts](Frontend/src/app/components/test/test.ts).
- Config is split in two: [StaticConfigService](Frontend/src/app/services/static.config.service.ts) is a typed wrapper
  over the committed [assets/configs/config.json](Frontend/src/assets/configs/config.json) (API / Identity URLs, timer,
  task counts, an events list), while
  [DynamicConfigService](Frontend/src/app/services/dynamic.config.service.ts) holds per-user settings (language, mute,
  theme) in `localStorage` under `<sub>-settings`. Almost every API call appends
  `language=${dynamicConfigService.language}`, so language is ambient state, not a route parameter.
- All HTTP goes through [ApiService](Frontend/src/app/services/api.service.ts) (RxJS `Observable`s, not signals).
  Saving a word posts `multipart/form-data` with the JSON payload in a `request` field plus `files` / `pronunciation`
  parts — matched on the server by `WordTranslationsController.Put`, which deserializes `Request.Form["request"]`
  manually with Newtonsoft.
- The conversation runner and the sentence exercise let the learner select any text (a word or a phrase) in model output
  and open it in `WordTranslationsDialogComponent` via a floating "Open in words" icon. Both position the icon with
  the shared `getTextBounds` in [core/text-selection.ts](Frontend/src/app/core/text-selection.ts). The sentence
  exercise only reacts to selections inside elements marked `.selectable`. Listening, Countability, VerbForms and
  Explain do the same; Countability and VerbForms mark a task's sentence `.selectable` only once it is answered, so the
  dialog can't give the answer away (and Countability's 1-3 option keys can't fire while typing in it), and Explain
  marks its hint, attempts and example explanation once the word is settled.

## Ports and URLs are wired in four places

Changing a port means updating all of: `launchSettings.json` for the project; `IdentityEndpoint` and `CORS:AllowOrigins`
in [Api/appsettings.Development.json](Backend/Api/appsettings.Development.json); `AppEndpoint` /
`PostLogoutAppEndpoint` in [Identity/appsettings.Development.json](Backend/Identity/appsettings.Development.json); and
the `identity` / `api` keys in the frontend `config.json`. OpenIddict client redirect URIs are seeded once by
`ClientsConfigHostedService` and are **not** refreshed on later startups — to change them, delete the
`OpenIddictApplications` row (the file keeps a commented `DeleteAsync` snippet for exactly this) and restart Identity.

`angular.json` lists a `public/` asset input that is absent from the repo.

## Notes

- Identity relaxes password rules to a 4-character minimum with no complexity, and requires a confirmed email — no mail
  sender is configured, so new accounts need manual confirmation in the database during development.
- There is no PrimeNG any more (removed to be free of its commercial license from v22). UI pieces live in
  [Frontend/src/app/ui/](Frontend/src/app/ui/): CSS classes `ui-button` / `ui-input` / `ui-inputgroup` /
  `ui-floatlabel` / `ui-toggleswitch` / `ui-checkbox`, components `app-select-button`, `app-progress-bar`,
  `app-scroll-top`, `app-popover`, `app-toast` (+ `ToastService`), `app-image`, `app-file-drop`,
  `app-autocomplete`, `app-pick-list`, directives `appTooltip` / `appAutoFocus` / `appAutoResize`, and
  `DialogService` over `@angular/cdk/dialog`.
- Colours: components read only `--ui-*` / `--color-*` from `styles.scss`; those read `--theme-*` from
  [ui/theme/_tokens.scss](Frontend/src/app/ui/theme/_tokens.scss) (Aura palettes and semantic tokens, dark values
  under `:root.theme-dark`). `ThemeService` sets `--theme-primary-*` / `--theme-surface-*` and the `theme-dark` /
  `theme-noir` classes on `<html>`; light/dark is chosen in the palette and defaults to the system preference.
- CDK overlays are kept out of the browser top layer (`OVERLAY_DEFAULT_CONFIG` `usePopover: false` in
  `app.config.ts`); otherwise dialogs paint above tooltips, popovers, toasts and the image preview regardless of
  `z-index`.
- `angular.json` budgets were raised (initial 1 MB warning / 2 MB error, component styles 16 / 32 kB) so
  `npm run build` passes; the initial bundle is ~800 kB and `home.scss` ~12 kB.
- Both backends compile with `<Nullable>disable</Nullable>`; don't add nullable annotations expecting them to be checked.
- `config.json` is committed and carries personal calendar entries. Treat it as user data: don't reproduce its contents
  in commits, issues, or generated docs.
