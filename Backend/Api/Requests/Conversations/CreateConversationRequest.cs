using Api.Enums;

namespace Api.Requests.Conversations;

public class CreateConversationRequest
{
    public Language Language { get; set; }
    public string Context { get; set; }
    public bool AutoFormat { get; set; }
    public bool SendImmediately { get; set; }
    public bool UseLearningWords { get; set; }
    public List<CreateConversationParticipantRequest> Participants { get; set; } = [];
}

public class CreateConversationParticipantRequest
{
    public string Name { get; set; }
    public string Description { get; set; }
    public bool IsUser { get; set; }
    public ParticipantGender Gender { get; set; }
}
