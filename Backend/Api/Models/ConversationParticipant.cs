using Api.Enums;

namespace Api.Models;

public class ConversationParticipant
{
    public int Id { get; init; }
    public int ConversationId { get; init; }
    public Conversation Conversation { get; init; }
    public string Name { get; set; }
    public string Description { get; set; }
    public bool IsUser { get; init; }
    public ParticipantGender Gender { get; set; }
    public ParticipantVoice Voice { get; set; }
    public List<ConversationMessage> Messages { get; init; } = [];
}
