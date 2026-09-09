using Api.Enums;

namespace Api.Representations;

public class WordTranslationsRepresentation
{
    public int Id { get; set; }
    public string Value { get; set; }
    public WordLearningProgress WordLearningProgress { get; set; }
    public Language Language { get; set; }
    public List<Translation> Translations { get; set; } = [];
    public List<Picture> Pictures { get; set; } = [];
    public List<Usage> Usages { get; set; } = [];
    public bool IsAnyNewPictureAvailable { get; set; }
    public bool HasPronunciation { get; set; }
    public DateTime? AddingDate { get; init; }
    public DateTime? LastLearningDate { get; set; }
}

public class Translation
{
    public int Id { get; set; }
    public int UserTranslationId { get; set; }
    public string Value { get; set; }
    public byte Position { get; init; }
    public bool Enabled { get; set; }
}

public class Picture
{
    public int Id { get; set; }
    public int UserPictureId { get; set; }
    public byte Position { get; init; }
    public bool Enabled { get; set; }
}

public class Usage
{
    public int Id { get; set; }
    public int UserUsageId { get; set; }
    public string Value { get; set; }
    public byte Position { get; init; }
    public bool Enabled { get; set; }
}

public sealed record WordPronunciationRepresentation(byte[] Data, string ContentType);
