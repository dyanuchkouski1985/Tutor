using Api.Enums;

namespace Api.Models;

public class UserStatistic
{
    public int Id { get; init; }
    public Guid UserId { get; init; }
    public Language Language { get; init; }
    public int Percentage { get; set; }
    public int ConversationPercentage { get; set; }
    public int CountabilityPercentage { get; set; }
    public int VerbFormsPercentage { get; set; }
    public int ArticlesPercentage { get; set; }
    public bool HasRepeatHalfPoint { get; set; }
    public DateOnly Date { get; init; }
}