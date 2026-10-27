# Listening

**Listening** (`ListeningService`, route `/listening-exercise`) is a voiced scene with comprehension questions.
- **English only** (`ListeningService.IsSupported`): Deepgram has English voices only.
- **One model call** writes 2-3 characters, 8-12 lines and 4 multiple-choice questions on a random topic, weaving in
  up to 6 random `None..Two` words. Word progress is untouched. Voices go through the shared
  `Speech/VoiceResolver` (also used by conversations); the server shuffles the options.
- **Stateless answer key**: nothing is stored. The correct option indexes travel to the client inside `Key`,
  encrypted with ASP.NET Data Protection (time-limited, 60 min). Each question is checked on its own (`POST Answer` with `QuestionIndex`, so the learner can answer
  without hints the questions they are sure of); an `IMemoryCache` entry per key id + question makes a resubmit
  worth 0 points. Keys stop working when the Api restarts unless the Data
  Protection key ring persists (it does by default on Windows dev machines).
- **Points**, judged per question by the hints used before that check: 4 per correct answer; 2 after the one allowed "listen again" (`IsReplayed`); 1 after "Show text"
  (`IsTextShown`, overrides the replay); 0 when wrong; no daily cap. Both flags are client-reported. Both hints sit
  behind the help icon. To make the replay limit mean something, the scene plays once (after "Start listening") and the
  player has no play, pause or line-skipping controls — only the speed menu; listening again goes through the
  "listen again" hint (free once the text is shown or the answers are checked) or a line's own play icon in the
  shown text.
- **Start**: the scene does not autoplay on load — a one-time "Start listening" button plays it, so the learner can
  read the situation first. The server shuffles the question order (before building `Key`), so questions don't
  follow the dialogue.
- **Translations**: the same model call translates every line into the RU/PL language picked before "Start
  listening" (shared with the sentence exercise's setting; switching reloads the scene). They show only once every
  question is answered: the `translate.svg` icon in a fixed column before each line toggles its translation, or "Show all translations"
  opens every line. A whole-line click was dropped: a quick click kept turning into a double-click.
- **Questions stay hidden** (with the hints and the help icon) until the scene has played through once
  (`isFirstListenDone`), so the options can't give the dialogue away.
- **Playback** awaits `SpeechService.speak` line by line with a request-id guard; speed (0.75×–2×, a dock-style row like the home icons) is
  `SpeechService.playbackRate` on the `Audio` element (reset to 1 when the component is destroyed).
