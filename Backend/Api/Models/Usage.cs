namespace Api.Models;

public class Usage
{
    public int Id { get; init; }
    public int WordId { get; init; }
    public Word Word { get; init; }
    public string Value { get; set; }
    public List<UserUsage> UserUsages { get; init; } = [];
}