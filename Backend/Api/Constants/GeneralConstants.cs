using Api.Enums;

namespace Api.Constants;

public static class GeneralConstants
{
    public const LanguageLevel DefaultLanguageLevel = LanguageLevel.B1;

    public const int WordTranslationsExerciseWordsCount = 6;
    public const int RepeatWordsExerciseWordsCount = 10;
    public const int RepeatWordsExerciseCompletedWordsCount = 3;
    public const int RepeatWordsCorrectAnswerPoints = 1;    public const int CrosswordBoardSize = 12;
    public const int CrosswordWordsCountPerDirection = 4;
    public const int CrosswordMinWordsCount = 2 * CrosswordWordsCountPerDirection;
    public const int RepeatWordsLearnedGreaterThanDays = 14;
    public const int CompletedWordsLearnedGreaterThanDays = 100;

    public const int DailyGoalPoints = 100;
    public const int TomorrowWordsCount = 12;
    public const int CalendarDefaultMonths = 6;
    public const int CalendarMaxMonths = 24;

    public const int ConversationTitleMaxLength = 100;
    public const int ConversationContextMaxLength = 1000;
    public const int ConversationParticipantNameMaxLength = 50;
    public const int ConversationParticipantDescriptionMaxLength = 1000;
    public const int ConversationMessageMaxLength = 1000;
    public const int ConversationValidationSummaryMaxLength = 500;
    public const int ConversationSummaryMaxLength = 2000;

    public const int ConversationHistoryMessagesCount = 100;
    public const int ConversationFormatHistoryMessagesCount = 6;
    public const int ConversationSummaryMinMessagesCount = 20;
    public const int ConversationFormatMaxAlternativesCount = 5;
    public const int ConversationLearningWordsMaxCount = 500;
    public const int ConversationMaxConsecutiveAiTurns = 3;
    public const int ConversationMinParticipantsCount = 2;
    public const int ConversationMaxParticipantsCount = 20;
    public const int ConversationGenerateMaxParticipantsCount = 5;
    public const int ConversationMaxSetupIssuesCount = 4;
    public const int ConversationMaxValidationErrorsCount = 4;
    public const int ConversationMaxDailyPoints = 25;
    public const int ConversationMessageMinPoints = 1;
    public const int ConversationMessageMaxPoints = 4;
    public const int ConversationsDefaultPageSize = 50;
    public const int ConversationMaxCountPerLanguage = 10;

    public const int MistakeCategoryMaxLength = 20;
    public const int MistakeRuleMaxLength = 100;
    public const int MistakeExplanationMaxLength = 500;
    public const int MistakeKnownRulesMaxCount = 50;
    public const int MistakeExamplesCount = 3;
    public const int MistakeMasteredReviewDays = 30;
    public const int MistakesExerciseTasksCount = 6;
    public const int MistakesExerciseMaxReviewsCount = 1;
    public const int MistakesExerciseMinNewCount = 2;
    public const int MistakesExerciseMaxTokens = 4096;
    public const int MistakesAnswerMaxTokens = 2048;
    public const int MistakesExerciseCorrectPoints = 3;
    public const int MistakesExerciseHintPoints = 2;

    public const int SentenceTranslationGenerateMaxTokens = 2048;
    public const int SentenceTranslationAnswerMaxTokens = 2048;
    public const int SentenceTranslationTasksCount = 3;
    public const int SentenceTranslationMaxHintsCount = 4;
    public const int SentenceTranslationHintPenaltyPoints = 1;
    public const int SentenceTranslationMinPoints = 1;
    public const int SentenceTranslationMaxPoints = 4;

    public const int GuessExerciseWordsCount = 3;
    public const int GuessCandidateWordsCount = 5;
    public const int GuessGenerateMaxTokens = 2048;
    public const int WordLeakStemMinWordLength = 5;
    public const int WordLeakStemMinLength = 4;
    public const int GuessMaxPoints = 3;
    public const int GuessMinPoints = 1;
    public const int GuessHintPenaltyPoints = 1;
    public const int GuessMaxHintsCount = 2;

    public const int ExplainExerciseWordsCount = 3;
    public const int ExplainGuessMaxTokens = 1024;
    public const int ExplainValidationMaxTokens = 1024;
    public const int ExplainMaxAttemptsCount = 3;
    public const int ExplainExplanationMaxLength = 500;
    public const int ExplainMaxPoints = 5;
    public const int ExplainHintPenaltyPoints = 1;
    public const int ExplainWrongGuessPenaltyPoints = 1;

    public const int ListeningWordsCount = 6;
    public const int ListeningMinParticipantsCount = 2;
    public const int ListeningMaxParticipantsCount = 3;
    public const int ListeningMinLinesCount = 8;
    public const int ListeningMaxLinesCount = 12;
    public const int ListeningQuestionsCount = 4;
    public const int ListeningMinWrongOptionsCount = 2;
    public const int ListeningMaxWrongOptionsCount = 3;
    public const int ListeningGenerateMaxTokens = 6144;
    public const int ListeningCorrectPoints = 4;
    public const int ListeningReplayedPoints = 2;
    public const int ListeningTextShownPoints = 1;
    public const int ListeningKeyLifetimeMinutes = 60;

    public const int CountabilityTasksCount = 5;
    public const int CountabilityMinOptionsCount = 2;
    public const int CountabilityMaxOptionsCount = 3;
    public const int CountabilityTopicsCount = 3;
    public const int CountabilityGenerateMaxTokens = 6144;
    public const int GapChoiceKeyLifetimeMinutes = 60;
    public const int CountabilityCorrectPoints = 1;
    public const int CountabilityDualMeaningPoints = 2;
    public const int CountabilityMaxDailyPoints = 10;
    public const string GapPlaceholder = "___";

    public const int ArticlesTasksCount = 5;
    public const int ArticlesGenerateTasksCount = 7;
    public const int ArticlesTopicsCount = 3;
    public const int ArticlesGenerateMaxTokens = 6144;
    public const int ArticlesCorrectPoints = 1;
    public const int ArticlesTrickyPoints = 2;
    public const int ArticlesMaxDailyPoints = 10;

    public const int VerbFormsTasksCount = 5;
    public const int VerbFormsTopicsCount = 3;
    public const int VerbFormsMaxAnswersCount = 3;
    public const int VerbFormsAnswerMaxLength = 50;
    public const int VerbFormsGenerateMaxTokens = 6144;
    public const int VerbFormsKeyLifetimeMinutes = 60;
    public const int VerbFormsCorrectPoints = 1;
    public const int VerbFormsMaxDailyPoints = 10;

    public const int WordSuggestionsMaxCount = 3;
    public const int WordSuggestionsExistingMaxCount = 20;
    public const int WordSuggestTranslationsMaxTokens = 2048;
    public const int WordSuggestUsagesMaxTokens = 3072;

    public const int AnthropicRequestTimeoutSeconds = 90;
    public const int AnthropicMaxRetries = 1;

    public const int ConversationSetupMaxTokens = 3072;
    public const int ConversationGenerateMaxTokens = 3072;
    public const int ConversationTurnMaxTokens = 4096;
    public const int ConversationValidationMaxTokens = 6144;
    public const int ConversationFormatMaxTokens = 4096;
    public const int ConversationSummaryMaxTokens = 2048;
}