using Api.Enums;

namespace Api.Requests.WordTranslations;

public class SearchWordTranslationsRequest
{
    public string Value { get; set; }
    public Language Language { get; set; }
    public int From { get; set; }
    public int Count { get; set; }
    public string SortBy { get; init; }
    public string SortOrder { get; init; }
    public List<WordLearningProgress> FilterLearningProgresses { get; set; } = [];
}