using Api.Enums;

namespace Api.Requests.WordTranslations;

public class SuggestWordItemsRequest
{
    public string Value { get; set; }
    public Language Language { get; set; }
    public TranslationLanguage TranslationLanguage { get; set; }
    public List<string> Existing { get; set; } = [];
}
