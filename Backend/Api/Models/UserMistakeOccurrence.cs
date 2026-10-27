namespace Api.Models;

public class UserMistakeOccurrence
{
    public int Id { get; init; }
    public int PatternId { get; init; }
    public UserMistakePattern Pattern { get; init; }
    public int? MessageId { get; init; }
    public ConversationMessage Message { get; init; }
    public string Fragment { get; init; }
    public string Correction { get; init; }
    public string Explanation { get; init; }
    public DateTime CreatedDate { get; init; }
}
