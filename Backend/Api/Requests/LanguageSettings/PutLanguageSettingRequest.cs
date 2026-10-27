using Api.Enums;

namespace Api.Requests.LanguageSettings;

public class PutLanguageSettingRequest
{
    public LanguageLevel Level { get; set; }
}
