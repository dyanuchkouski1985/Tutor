using Api.Enums;

namespace Api.Representations;

public class TranslationsWordRepresentation
{
    public int WordId { get; init; }
    public string Word { get; set; }
    public WordLearningProgress WordLearningProgress { get; init; }
    public List<string> Translations { get; set; } = [];
    public List<int> PictureIds { get; set; } = [];
    public List<string> Usages { get; set; } = [];
    public bool IsAnyNewPictureAvailable { get; set; }
}
