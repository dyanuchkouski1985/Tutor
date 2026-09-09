using Api.Enums;

namespace Api.Models;

public class Word
{
    public int Id { get; init; }
    public string Value { get; init; }
    public Language Language { get; init; }
    public byte[] PronunciationData { get; set; }
    public string PronunciationContentType { get; set; }
    public string PronunciationExtension { get; set; }
    public long? PronunciationLength { get; set; }
    public List<UserWordLearningProgress> UserWordLearningProgresses { get; init; } = [];
    public List<Translation> Translations { get; init; } = [];
    public List<Picture> Pictures { get; init; } = [];
    public List<Usage> Usages { get; init; } = [];
}