namespace Api.Requests.Conversations;

public class FormatConversationMessageRequest
{
    public string Text { get; set; }

    public List<string> Alternatives { get; set; }
}
