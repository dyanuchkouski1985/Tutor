using Api.Enums;

namespace Api.Requests.Conversations;

public class GenerateConversationRequest
{
    public Language Language { get; set; }
    public string LearnerName { get; set; }
    public string PreviousContext { get; set; }
}
