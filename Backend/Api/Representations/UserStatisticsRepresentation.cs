namespace Api.Representations;

public class UserStatisticsRepresentation
{
    public string Email { get; set; }
    public int DailyPercentage { get; set; }
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
}
