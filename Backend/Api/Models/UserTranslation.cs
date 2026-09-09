namespace Api.Models;

public class UserTranslation
{
    public int Id { get; init; }
    public Guid UserId { get; init; }
    public int TranslationId { get; init; }
    public Translation Translation { get; init; }
    public byte Position { get; set; }
}