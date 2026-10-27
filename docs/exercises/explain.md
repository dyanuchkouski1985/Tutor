# Explain

**Explain** (`ExplainService`, route `/explain-exercise`) is Guess reversed: the learner explains a word and the model
guesses it.
- **Words**: 3 random `One..Three` words (`ExplainExerciseWordsCount`). GET returns the word with the user's
  translations and usages; only the translations are the hint, the usages show once the word is settled (they made
  explaining too easy). It also returns an `ExampleExplanation`, shown once the word is done.
  It comes from Guess's `DescribeWordsAsync` (one call for all 3 words, at the learner's level) and is null when that
  call fails, so the exercise never depends on it.
- **Stateless attempts**: nothing is stored. Each `POST api/Explain/Guess` carries the earlier explanations and wrong guesses, and
  the server derives the attempt number from that list (client-reported, like the hint flag). The model never sees the
  target word, only the explanations and its own wrong guesses, so it cannot cheat.
- **Rejections cost no attempt**: an explanation is rejected before the model call when `WordLeak.Reveals` (the
  helper Guess uses) finds the word, its stem or any of the user's translations in it. A separate referee call
  (`ValidateExplanationAsync`, which unlike the guesser does see the word) rejects it too (`isValid: false` with a
  `reason`) when any part gives clues about the word's form (letter count, letters, rhymes), is not in the practice
  language, is a translation, or explains nothing. It runs in parallel with the guess, which is discarded on a
  rejection.
- **Points and progress** are settled on the guess that succeeds or on the third failure
  (`ExplainMaxAttemptsCount`): 5, minus 1 if the hint was shown, minus 1 per earlier wrong guess (so 2-5); 0 when never
  guessed; no daily cap. A guess matches case-insensitively, and for English "to run" equals "run". Progress moves
  like Guess.
- **"Don't know"** posts `IsGivenUp`: the server skips the model calls and settles the word as never guessed (0 points,
  progress −1) without adding an attempt.
