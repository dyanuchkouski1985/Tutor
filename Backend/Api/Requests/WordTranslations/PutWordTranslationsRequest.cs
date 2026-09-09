using Api.Enums;

namespace Api.Requests.WordTranslations;

public class PutWordTranslationsRequest
{
    public int Id { get; set; }
    public string Value { get; set; }
    public Language Language { get; set; }
    public WordLearningProgress WordLearningProgress { get; set; }
    public bool UserUpload { get; set; }
    public List<Translation> Translations { get; set; } = new();
    public List<Picture> Pictures { get; set; } = new();
    public List<Usage> Usages { get; set; } = new();
    public FormFile Pronunciation { get; set; }
}

public class Translation
{
    public int Id { get; set; }
    public int UserTranslationId { get; set; }
    public string Value { get; set; }
    public byte Position { get; set; }
    public bool Enabled { get; set; }
}

public class Picture
{
    public int Id { get; set; }
    public int UserPictureId { get; set; }
    public byte Position { get; set; }
    public bool Enabled { get; set; }
}

public class Usage
{
    public int Id { get; set; }
    public int UserUsageId { get; set; }
    public string Value { get; set; }
    public byte Position { get; set; }
    public bool Enabled { get; set; }
}