using Api.Enums;

namespace Api.Requests.WordTranslations;

public class GetWordTranslationsRequest
{
    public string Value { get; set; }
    public Language Language { get; set; }
}