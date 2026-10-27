namespace Api.Requests.Conversations;

public class UpdateConversationRequest
{
    public string Context { get; set; }
    public bool AutoFormat { get; set; }
    public bool SendImmediately { get; set; }
    public bool UseLearningWords { get; set; }
    public List<UpdateConversationParticipantRequest> Participants { get; set; } = [];
}

public class UpdateConversationParticipantRequest : CreateConversationParticipantRequest
{
    public int Id { get; set; }
}
