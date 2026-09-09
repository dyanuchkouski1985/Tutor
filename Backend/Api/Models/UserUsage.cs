namespace Api.Models;

public class UserUsage
{
    public int Id { get; init; }
    public Guid UserId { get; init; }
    public int UsageId { get; init; }
    public Usage Usage { get; init; }
    public byte Position { get; set; }
}