namespace Api.Representations;

public class UserStatisticsRepresentation
{
    public string Email { get; set; }
    public int DailyPercentage { get; set; }
    public int ConversationPercentage { get; set; }
    public int ConversationMaxDailyPoints { get; set; }
    public int CountabilityPercentage { get; set; }
    public int CountabilityMaxDailyPoints { get; set; }
    public int VerbFormsPercentage { get; set; }
    public int VerbFormsMaxDailyPoints { get; set; }
    public int ArticlesPercentage { get; set; }
    public int ArticlesMaxDailyPoints { get; set; }
    public int TotalNumberOfWords { get; init; }
    public int TotalNumberOfCompletedWords { get; init; }
    public int TotalNumberOfPausedWords { get; init; }
    public int TotalNumberOfWordsWithProgress3 { get; init; }
    public int TotalNumberOfWordsWithProgress2 { get; init; }
    public int TotalNumberOfWordsWithProgress1 { get; init; }
    public int TotalNumberOfWordsWithProgress0 { get; set; }
    public List<int> LastDaysPercentages { get; set; } = [];
    public int AvailableRepeatPausedWordsCount { get; set; }
    public bool IsAvailableRepeatPausedWordsExercise { get; set; }
    public bool IsAvailableTranslationsWordExercise { get; set; }
    public bool IsAvailableCrosswordExercise { get; set; }
    public bool IsAvailableGuessExercise { get; set; }
    public bool IsAvailableExplainExercise { get; set; }
    public bool IsAvailableListeningExercise { get; set; }
    public bool IsAvailableCountabilityExercise { get; set; }
    public bool IsAvailableVerbFormsExercise { get; set; }
    public bool IsAvailableArticlesExercise { get; set; }
    public bool IsAvailableTomorrowWords { get; set; }
}
