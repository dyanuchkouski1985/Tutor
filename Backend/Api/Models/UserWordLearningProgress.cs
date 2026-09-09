using Api.Enums;

namespace Api.Models;

public class UserWordLearningProgress
{
    public int Id { get; init; }
    public Guid UserId { get; init; }
    public int WordId { get; init; }
    public Word Word { get; init; }
    public WordLearningProgress WordLearningProgress { get; set; }
    public DateTime AddingDate { get; init; }
    public DateTime LastLearningDate { get; set; }
}