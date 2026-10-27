# SentenceTranslation

**SentenceTranslation** is word-free too: it touches no learning progress and needs no minimum word count, so the
home dock never disables it. Each run the model writes 3 sentences at the learner's level
(`SentenceTranslationTasksCount`), each on a topic the server picks at random from a fixed list so runs don't repeat.
Each sentence comes with a reference `translation` and up to 4 `hints` (a fragment of the sentence + its
translation).
- **Points** are 1-4 and, like conversation points, the *model's* judgement: it starts from 4 and takes one off per
  mistake. The prompt and the schema's `enum` are built from `SentenceTranslationMin/MaxPoints`. The server clamps
  to that range and awards 0 when the meaning is wrong.
- **Hints**: the frontend underlines them only after "Help". Each one revealed before answering costs 1 point
  (`RevealedHintsCount`, client-reported), but a correct meaning never earns less than 1.
- **No daily cap**: unlike conversations, sentence points are not capped per day.
- **Mistakes**: the check also returns language `errors` in the conversation format. These feed the Mistakes drill
  through the shared `TutorContext.RecordMistakesAsync` / `GetKnownMistakeRulesAsync`
  ([UserMistakeExtensions.cs](../../Backend/Api/Models/UserMistakeExtensions.cs)). A sentence occurrence has no
  `MessageId`. Omitted or added details cost points but are never recorded as mistakes.
- **"Don't know"** is client-only: it shows the reference translation and records a 0-point result.
- **Language switch**: changing the sentence language mid-exercise re-requests `GET Exercise?count=<pending>` and
  replaces only the unanswered tasks.
- **Result screen**: the component renders its own summary list of sentences instead of `ExerciseResultComponent`.
