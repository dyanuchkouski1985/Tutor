using Api.Enums;

namespace Api.Requests.Conversations;

public class SearchConversationsRequest
{
    public Language Language { get; set; }
    public string Value { get; set; }
    public int From { get; set; }
    public int Count { get; set; }
    public string SortBy { get; init; }
    public string SortOrder { get; init; }
}
