using Api.Enums;

namespace Api.Models;

public class UserLanguageSetting
{
    public int Id { get; init; }
    public Guid UserId { get; init; }
    public Language Language { get; init; }
    public LanguageLevel Level { get; set; }
}
