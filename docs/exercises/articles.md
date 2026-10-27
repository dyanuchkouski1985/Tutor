# Articles

**Articles** (`ArticlesService`, route `/articles-exercise`) is Countability's sibling on the same
`GapChoiceServiceBase` and the shared frontend `GapChoiceExerciseComponent` (each route is a thin wrapper passing a
`GapChoiceExerciseConfig`).
- **English only**, word-free: one model call writes 7 tasks (`ArticlesGenerateTasksCount`), a gap in the place of an
  article, on 3 random topics; the first 5 valid ones are kept.
  Kind `simple` (first mention, known / unique, general sense, an uncountable trap) or `tricky` (fixed expressions,
  a / an by sound, place names, superlatives).
- **Options are always `a, an, the, —`** in that order (keys 1-4), so the model only returns the answer; the schema's
  `enum` restricts it to those four.
- **Gap check**: the model also writes the complete `correctSentence`; a task whose gap, filled with the answer,
  does not give back that sentence is dropped (catches a lost preposition: `___ bus` instead of `by ___ bus`). A
  stray `—` the model sometimes writes into `correctSentence` for "no article" is ignored in that comparison.
- **Points**: 1, 2 for `tricky` (`ArticlesTrickyPoints`), capped at `ArticlesMaxDailyPoints` (10) per day via
  `UserStatistic.ArticlesPercentage`. A wrong answer goes into the Mistakes drill with category `article`.
