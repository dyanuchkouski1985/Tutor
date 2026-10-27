using Api.Enums;

namespace Api.Models;

public class Conversation
{
    public int Id { get; init; }
    public Guid UserId { get; init; }
    public Language Language { get; init; }
    public string Title { get; set; }
    public string Context { get; set; }
    public bool AutoFormat { get; set; }
    public bool UseLearningWords { get; set; }
    public bool SendImmediately { get; set; } = true;
    public int? NextSpeakerId { get; set; }
    public string Summary { get; set; }
    public int? SummaryMessageId { get; set; }
    public ConversationParticipant NextSpeaker { get; set; }
    public DateTime CreatedDate { get; init; }
    public DateTime LastActivityDate { get; set; }
    public List<ConversationParticipant> Participants { get; init; } = [];
    public List<ConversationMessage> Messages { get; init; } = [];
}
