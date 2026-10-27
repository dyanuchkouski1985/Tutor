using Api.Enums;
using Api.Representations;
using Api.Requests.LanguageSettings;

namespace Api.Interfaces.Services;

public interface ILanguageSettingsService
{
    Task<LanguageSettingRepresentation> GetAsync(Language language);

    Task<LanguageSettingRepresentation> PutAsync(Language language, PutLanguageSettingRequest request);

    Task<LanguageLevel> GetLevelAsync(Language language);
}
