# Countability

**Countability** (`CountabilityService`, route `/countability-exercise`, dock label "Much or many") is a gap-fill drill
on countable / uncountable nouns.
- **English only** (`CountabilityService.IsSupported`, `IsAvailableCountabilityExercise`). Word-free: the model picks
  the nouns itself, mostly traps that are countable in Russian/Polish, a few dual-meaning nouns whose sentence fixes the
  meaning, and one or two plain countables. Three random topics per run keep the nouns from repeating.
- **One model call** writes 5 tasks, each tagged `trap` / `dual` / `countable`: a sentence with one `___` gap, the answer and 1-2 wrong options (`—` means "no
  word"), an explanation, and a mistake category + rule, matched to the learner's known rules.
- **Stateless answer key** like Listening: everything needed to check a task, explanation included, travels in the
  Data Protection `Key`; `IMemoryCache` makes a resubmit worth 0 and stops it recording the mistake twice.
- The key, resubmit guard, daily cap and mistake recording live in `GapChoiceServiceBase` (shared `GapChoice*`
  representations and request); `CountabilityService` only turns its AI tasks into drafts with shuffled options.
- **Points**: 1 per correct answer, 2 for a `dual` noun (`CountabilityDualMeaningPoints`), capped at `CountabilityMaxDailyPoints` (10) per day via
  `UserStatistic.CountabilityPercentage`. A wrong answer goes straight into the Mistakes drill (`RecordMistakesAsync`
  with the wrong and the correct filled sentence). Word progress is untouched.
