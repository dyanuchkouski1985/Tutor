using Api.Enums;

namespace Api.Models;

public class UserMistakePattern
{
    public int Id { get; init; }
    public Guid UserId { get; init; }
    public Language Language { get; init; }
    public string Category { get; init; }
    public string Rule { get; init; }
    public MistakeProgress Progress { get; set; }
    public DateTime CreatedDate { get; init; }
    public DateTime? LastPracticeDate { get; set; }
    public List<UserMistakeOccurrence> Occurrences { get; init; } = [];
}
