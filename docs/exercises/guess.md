# Guess

**Guess** (`GuessService`, route `/guess-exercise`; called Taboo until renamed, so its prompts still say "taboo game")
is mode A of the plan's "explain the word": the model describes a word and the learner types it.
- **Words**: 5 random `One..Three` words go to one `DescribeWordsAsync` call with the user's translations to pin the
  meaning; the first 3 that survive the leak check are used.
- **Leak check**: `WordLeak.Reveals` rejects a clue containing the word or its stem (all but the last two letters, for words of
  5+ letters). A leaked description is replaced by the example; if both leak the word is dropped.
- **No word in GET**: tasks carry the word only as server-shuffled `Letters`; `POST Answer` returns the word,
  translations, usages and the new progress, and an empty answer is "Don't know".
- **Hints**: the example sentence, then the letter tiles of the shared `LetterHintComponent` (the same one
  TranslationsWord's help mode uses).
- **Points and progress**: exact, case-insensitive match; 3 minus 1 per revealed hint, never below 1; 0 when wrong;
  no daily cap. Progress moves like TranslationsWord: +1 (capped at `Three`) / −1 (floored at `None`), and
  `LastLearningDate` is bumped.
