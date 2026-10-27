# VerbForms

**VerbForms** (`VerbFormsService`, route `/verb-forms-exercise`) drills past simple / past participle forms of
irregular verbs, built like Countability but typed instead of chosen.
- **English only**, word-free: the model picks 5 irregular verbs and writes a sentence for each with one `___` gap
  followed by the base form in brackets, `Yesterday she ___ (go) home.` The learner types the form; there are no
  options and no hints.
- **Answers**: the model lists every accepted form (`learnt` and `learned`); the server matches case-insensitively
  after trimming, against the list carried in the Data Protection `Key`.
- **Points**: 1 per correct answer, never more, capped at `VerbFormsMaxDailyPoints` (10) per day via
  `UserStatistic.VerbFormsPercentage`. A wrong non-empty answer goes into the Mistakes drill with the bracketed base
  form stripped from both sentences; an empty answer is "Don't know" and records nothing.
- The gap helpers shared with Countability live in `GapSentence` (`GeneralConstants.GapPlaceholder`).
