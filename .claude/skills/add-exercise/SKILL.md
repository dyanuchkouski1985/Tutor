---
name: add-exercise
description: Checklist for adding a new exercise or drill to Tutor (backend service + controller, statistics flag and daily cap, home-dock icon, route, page component, docs). Use whenever the user wants a new exercise, drill, practice mode or dock icon, or asks to split an existing exercise into a new one.
---

# Adding an exercise

An exercise touches about a dozen files across both projects, and a missed one fails quietly: the icon never
disables, the page renders off-centre, the daily counter reads 0. Work through the list below. Copy the closest
existing exercise rather than inventing structure:

| New exercise is… | Copy from |
| --- | --- |
| built on the learner's words, moves learning progress | Guess (`GuessService`, `guess-exercise/`) |
| AI-written gap fill with fixed options | Articles (`ArticlesService` on `GapChoiceServiceBase`, `articles-exercise/`) |
| AI-written, typed answer | VerbForms (`VerbFormsService`, `verb-forms-exercise/`) |
| AI-written with free-text grading | SentenceTranslation |

## 0. Agree the steps first

The user reviews code as it lands. Before writing anything, post a numbered step list (roughly the sections below)
and implement one step per turn, each one compiling on its own, unless the user asks for everything at once.
Decide with the user up front: points per answer, daily cap or not, word-based or word-free, English only or both
languages, and whether wrong answers feed the Mistakes drill.

## 1. Backend (Backend/Api)

- **Constants** in `Constants/GeneralConstants.cs`: task count, points, daily cap, max tokens, key lifetime,
  grouped under the exercise's name prefix.
- **AI service** (if the model writes tasks): `I<Name>AiService` + `<Name>AiService : AiServiceBase`. Use
  `BuildSchema` for structured output and `CallAsync`. Read the learner's level with
  `ILanguageSettingsService.GetLevelAsync` in the business service and pass it in; describe it with `DescribeLevel`.
  Ask the model for a couple of spare tasks and keep the first valid N when the server drops broken ones
  (Articles writes 7, keeps 5).
- **Business service** `I<Name>Service` + `<Name>Service`. It captures the user in a property initializer, so it
  must never be resolved on an anonymous request.
  - Word-based: a `CountAvailableWordsAsync` that mirrors the GET's selection filter exactly, and the GET returns an
    empty result below the minimum.
  - Stateless answer key: carry the check data in a time-limited Data Protection `Key` plus an `IMemoryCache`
    resubmit guard, like Listening or `GapChoiceServiceBase`.
  - Points always go through `TutorContext.GetOrCreateTodayStatisticAsync`, never a query of its own.
  - Wrong answers worth practising: `TutorContext.RecordMistakesAsync`.
- **Daily cap** (if any): an `int <Name>Percentage` column on `Models/UserStatistic.cs`, added together with
  `Percentage` on every award. Then create the migration with the `ef-migration` skill. Migrations are not applied
  at startup; tell the user to run `dotnet ef database update --project Backend/Api`.
- **Statistics** in `Services/BusinessLogic/UserStatisticsService.cs` and
  `Representations/UserStatisticsRepresentation.cs`: `IsAvailable<Name>Exercise` (word count ≥ minimum, or
  `<Name>Service.IsSupported(language)` for an English-only exercise), plus `<Name>Percentage` and
  `<Name>MaxDailyPoints` when capped.
- **Controller** `Controllers/<Name>Controller.cs`: thin, `[Authorize]`, primary-constructor injection,
  `[HttpGet("[action]")] Exercise` and `[HttpPost("[action]")] Answer`. Requests go in `Requests/<Name>/`,
  responses in `Representations/`.
- **Registration** in `Infrastructure/ServiceCollectionExtensions.cs` (`AddBusinessServices`), never in
  `Program.cs`.

## 2. Frontend (Frontend/src)

- **Models** in `app/models/`, and the new statistics fields in `app/models/user-statistics.ts`, including the
  `ExerciseAvailabilityFlag` union.
- **API calls** in `app/services/api.service.ts`, appending `language=${this.dynamicConfigService.language}`.
- **Component** `app/components/<name>-exercise/<name>-exercise.{ts,html,scss}`: standalone, class
  `<Name>ExerciseComponent`, `changeDetection: ChangeDetectionStrategy.Eager`, UI from `app/ui/` only. Reuse
  `ExerciseUnavailableComponent` for an empty GET and, where it fits, `ExerciseResultComponent` with
  `availabilityFlag` so "Repeat" disables. Save each answer as it is given and call
  `UserStatisticsService.refresh()` after it.
- **Completion mark**: add the exercise to `ExerciseType` (backend) and `ExerciseTypeEnum` (frontend) with the same
  number, and call `ExerciseCompletionsService.markCompleted` once where the run ends (next to the finish sound).
  Give it a label and icon in the `exercises` map of `exercise-popularity.ts`, and add it to `englishOnlyExercises`
  in `ExerciseCompletionsService` if it is English only.
- **Selectable model text**: mark it `.selectable` and reuse the "Open in words" icon with `getTextBounds`
  (`app/core/text-selection.ts`). Only mark text selectable once it can no longer give the answer away.
- **Route** in `app/app.routes.ts`: lazy `loadComponent`, `canActivate: [AuthGuard]`.
- **Page centring**: add the component selector to the `display: block; clear: left` list in `src/styles.scss`,
  otherwise the page sits beside the floated statistics.
- **Home dock** in `app/components/home/home.html` + `home.ts`: a `dock-item` with
  `[class.started]="isExerciseStarted('/<name>-exercise')"`, an `onStart<Name>Exercise()` that checks
  `isExerciseUnavailable('isAvailable<Name>Exercise')` and calls `startExercise`, the `n/max` daily counter when
  capped, and a `dock-label`. English-only icons go inside the `@if (language === englishLanguage)` block.
- **Icon** `src/assets/images/svg/<name>.svg`: outline style, stroke 7, 122.88 viewBox, site/AI top-left and
  learner bottom-right, the agreed marks for word / sentence / blank. Show a draft beside the current icons before
  committing to it.

## 3. Docs and checks

- Add `docs/exercises/<name>.md` (same shape as the others: what it is, words, points, hints, edge cases) and a row
  in the Exercises table in `CLAUDE.md`. Add the exercise to the shared-pattern bullets there if it fits one, and
  update the minimum-word-count paragraph for a word-based exercise.
- Build both sides: `dotnet build Backend/Tutor.sln` (if a running Api locks `Api.exe`, build with
  `-o` into the scratchpad instead of killing it) and `npx ng build --configuration development` in `Frontend/`.
  Run `npx prettier --write` on the touched frontend files.
- For AI-written tasks, run the real generation a few times outside the app (a small console project referencing
  a scratchpad build of `Api.dll`, with the Api's user secrets) and check how many tasks survive the server's
  filters before calling it done.
