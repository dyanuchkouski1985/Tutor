namespace Api.Ai;

public sealed class AiResult<T>
{
    public bool IsSuccess { get; init; }
    public string ErrorMessage { get; init; }
    public T Value { get; init; }

    public static AiResult<T> Success(T value) => new() { IsSuccess = true, Value = value };

    public static AiResult<T> Failure(string errorMessage) =>
        new() { IsSuccess = false, ErrorMessage = errorMessage };
}

public sealed record AiParticipant(string Name, string Description, bool IsUser);

public sealed record AiMessage(string SpeakerName, string Text);

public sealed class AiConversationSetup
{
    public bool IsSufficient { get; set; }
    public string Reason { get; set; }
    public List<AiSetupIssue> Issues { get; set; } = [];
    public string Title { get; set; }
    public string FirstSpeaker { get; set; }
    public List<AiParticipantVoice> Voices { get; set; } = [];
}

public sealed class AiSetupIssue
{
    public string Field { get; set; }
    public string ParticipantName { get; set; }
    public string Problem { get; set; }
    public string Suggestion { get; set; }
}

public sealed class AiParticipantVoice
{
    public string Name { get; set; }
    public string Voice { get; set; }
}

public sealed class AiGeneratedConversation
{
    public string Context { get; set; }
    public string LearnerDescription { get; set; }
    public List<AiGeneratedParticipant> Participants { get; set; } = [];
}

public sealed class AiGeneratedParticipant
{
    public string Name { get; set; }
    public string Description { get; set; }
    public string Gender { get; set; }
}

public sealed class AiConversationTurn
{
    public string Speaker { get; set; }
    public string Text { get; set; }
    public string NextSpeaker { get; set; }
    public bool Declined { get; set; }
    public string JoiningName { get; set; }
    public string JoiningDescription { get; set; }
    public string JoiningGender { get; set; }
    public string JoiningVoice { get; set; }
}

public sealed class AiFormattedMessage
{
    public string Text { get; set; }
}

public sealed class AiConversationSummary
{
    public string Summary { get; set; }
}

public sealed class AiMessageValidation
{
    public bool IsCorrect { get; set; }
    public string Summary { get; set; }
    public List<AiValidationError> Errors { get; set; } = [];
    public int Points { get; set; }
}

public sealed class AiValidationError
{
    public string Fragment { get; set; }
    public string Correction { get; set; }
    public string Explanation { get; set; }
    public string Category { get; set; }
    public string Rule { get; set; }
}

public sealed record AiMistakeRule(int Id, string Category, string Rule, IReadOnlyList<string> Examples);

public sealed class AiMistakeTasks
{
    public List<AiMistakeTask> Items { get; set; } = [];
}

public sealed class AiMistakeTask
{
    public int Id { get; set; }
    public string Sentence { get; set; }
    public string Fragment { get; set; }
    public string CorrectedSentence { get; set; }
    public string Explanation { get; set; }
}

public sealed class AiMistakeAnswerCheck
{
    public bool IsCorrect { get; set; }
    public string CorrectedSentence { get; set; }
    public string Explanation { get; set; }
}

public sealed class AiWordSuggestions
{
    public List<string> Items { get; set; } = [];
}

public sealed class AiSentenceTasks
{
    public List<AiSentenceTask> Items { get; set; } = [];
}

public sealed class AiSentenceTask
{
    public string Sentence { get; set; }
    public string Translation { get; set; }
    public List<AiSentenceHint> Hints { get; set; } = [];
}

public sealed class AiSentenceHint
{
    public string Fragment { get; set; }
    public string Translation { get; set; }
}

public sealed record AiGuessWord(int Id, string Word, IReadOnlyList<string> Translations);

public sealed class AiGuessDescriptions
{
    public List<AiGuessDescription> Items { get; set; } = [];
}

public sealed class AiGuessDescription
{
    public int Id { get; set; }
    public string Description { get; set; }
    public string Example { get; set; }
}

public sealed class AiSentenceAnswerCheck
{
    public bool IsMeaningCorrect { get; set; }
    public List<AiValidationError> Errors { get; set; } = [];
    public int Points { get; set; }
    public string NaturalTranslation { get; set; }
    public string Explanation { get; set; }
}

public sealed class AiListeningScene
{
    public string Situation { get; set; }
    public List<AiListeningParticipant> Participants { get; set; } = [];
    public List<AiListeningLine> Lines { get; set; } = [];
    public List<AiListeningQuestion> Questions { get; set; } = [];
}

public sealed class AiListeningParticipant
{
    public string Name { get; set; }
    public string Gender { get; set; }
    public string Voice { get; set; }
}

public sealed class AiListeningLine
{
    public string Speaker { get; set; }
    public string Text { get; set; }
    public string Translation { get; set; }
}

public sealed class AiListeningQuestion
{
    public string Question { get; set; }
    public string Answer { get; set; }
    public List<string> WrongOptions { get; set; } = [];
}

public sealed class AiCountabilityTasks
{
    public List<AiCountabilityTask> Tasks { get; set; } = [];
}

public sealed class AiCountabilityTask
{
    public string Kind { get; set; }
    public string Noun { get; set; }
    public string Sentence { get; set; }
    public string Answer { get; set; }
    public List<string> WrongOptions { get; set; } = [];
    public string Explanation { get; set; }
    public string Category { get; set; }
    public string Rule { get; set; }
}

public sealed class AiArticleTasks
{
    public List<AiArticleTask> Tasks { get; set; } = [];
}

public sealed class AiArticleTask
{
    public string Kind { get; set; }
    public string Noun { get; set; }
    public string CorrectSentence { get; set; }
    public string Sentence { get; set; }
    public string Answer { get; set; }
    public string Explanation { get; set; }
    public string Rule { get; set; }
}

public sealed class AiVerbFormTasks
{
    public List<AiVerbFormTask> Tasks { get; set; } = [];
}

public sealed class AiVerbFormTask
{
    public string Verb { get; set; }
    public string PastSimple { get; set; }
    public string PastParticiple { get; set; }
    public string Sentence { get; set; }
    public List<string> Answers { get; set; } = [];
    public string Explanation { get; set; }
    public string Category { get; set; }
    public string Rule { get; set; }
}

public sealed record AiExplainAttempt(string Explanation, string Guess);

public sealed class AiExplainValidation
{
    public bool IsValid { get; set; }
    public string Reason { get; set; }
}

public sealed class AiExplainGuess
{
    public string Guess { get; set; }
}
