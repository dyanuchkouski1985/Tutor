using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Api.Requests.LanguageSettings;
using Microsoft.EntityFrameworkCore;

namespace Api.Services.BusinessLogic;

public class LanguageSettingsService(
    TutorContext dbContext,
    ISecurityContext securityContext)
    : ILanguageSettingsService
{
    private TutorContext DbContext { get; } = dbContext;
    private Guid UserId { get; } = Guid.Parse(securityContext.GetCurrentUserId());

    public async Task<LanguageSettingRepresentation> GetAsync(Language language) =>
        new() { Level = await GetLevelAsync(language) };

    public async Task<LanguageSettingRepresentation> PutAsync(Language language,
        PutLanguageSettingRequest request)
    {
        var setting = await DbContext.UserLanguageSettings
            .FirstOrDefaultAsync(setting => setting.UserId == UserId && setting.Language == language);

        if (setting == null)
        {
            setting = new UserLanguageSetting { UserId = UserId, Language = language };
            DbContext.UserLanguageSettings.Add(setting);
        }

        setting.Level = request.Level;

        await DbContext.SaveChangesAsync();

        return new LanguageSettingRepresentation { Level = setting.Level };
    }

    public async Task<LanguageLevel> GetLevelAsync(Language language)
    {
        var level = await DbContext.UserLanguageSettings
            .AsNoTracking()
            .Where(setting => setting.UserId == UserId && setting.Language == language)
            .Select(setting => (LanguageLevel?)setting.Level)
            .FirstOrDefaultAsync();

        return level ?? GeneralConstants.DefaultLanguageLevel;
    }
}
