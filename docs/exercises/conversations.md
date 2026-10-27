# Conversations (speech exercise)

Conversations are also a statistics source but touch no learning progress. `ConversationService.PostMessageAsync`
awards a learner message 1-4 points, and the number is the *model's* judgement — `ValidateMessageAsync` returns a
`points` field scored on message length minus one per grammar error. Unlike an exercise a chat is unbounded, so
conversation points are capped at `ConversationMaxDailyPoints` (25) per day per language, tracked in
`UserStatistic.ConversationPercentage` (a counter of the conversation share of `Percentage`, not a second score).
A message whose validation call failed stays `NotValidated` and earns nothing, so a missing `Anthropic:ApiKey` means
conversations award zero rather than free points.

Conversation memory and cast:
- **History window**: each AI turn sees only the last `ConversationHistoryMessagesCount` (100) messages. The rest
  lives in `Conversation.Summary`, a running "story so far" written by `ConversationAiService.SummarizeAsync`.
- **Summary refresh**: `TurnAsync` folds messages that dropped out of the window into the summary once at least
  `ConversationSummaryMinMessagesCount` (20) of them sit past `SummaryMessageId`. It runs before the turn and saves
  at once; a failed call keeps the old summary.
- **Summary in the prompt**: `GetNextTurnAsync` puts it under `STORY SO FAR`, and the system prompt forbids
  contradicting it or denying anyone it mentions. Without it, a character who was only talked about (never on the
  participant list) was forgotten once their lines left the window.
- **Participant limits** apply only at setup: up to `ConversationMaxParticipantsCount` (20, learner included) when
  created by hand, and `ConversationGenerateMaxParticipantsCount` (5, the learner plus up to 4 characters) when the
  model generates the scene. People who join mid-conversation are unlimited, so `UpdateAsync` must not re-check the
  maximum.
- **Message colours**: the runner cycles through `MESSAGE_COLORS_COUNT` (20) colours, generated from the
  `$message-hues` list in `styles.scss`. The number 20 also appears in the runner's SCSS `@for`.
