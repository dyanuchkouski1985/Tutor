namespace Api.Representations;

public class UserStatisticsCalendarRepresentation
{
    public DateOnly From { get; init; }
    public DateOnly To { get; init; }
    public int DailyGoalPoints { get; init; }
    public int ConversationMaxDailyPoints { get; init; }
    public List<UserStatisticsCalendarDayRepresentation> Days { get; init; } = [];
}

public class UserStatisticsCalendarDayRepresentation
{
    public DateOnly Date { get; init; }
    public int Percentage { get; init; }
    public int ConversationPercentage { get; init; }
}
