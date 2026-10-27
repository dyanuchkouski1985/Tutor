using Api.Ai;
using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Caching.Memory;

namespace Api.Services.BusinessLogic;

public class CountabilityService(
    TutorContext dbContext,
    ISecurityContext securityContext,
    ICountabilityAiService aiService,
    ILanguageSettingsService languageSettingsService,
    IDataProtectionProvider dataProtectionProvider,
    IMemoryCache memoryCache)
    : GapChoiceServiceBase(dbContext, securityContext, languageSettingsService, dataProtectionProvider, memoryCache,
        "Countability"), ICountabilityService
{
    private ICountabilityAiService AiService { get; } = aiService;

    protected override int TasksCount => GeneralConstants.CountabilityTasksCount;
    protected override int MaxDailyPoints => GeneralConstants.CountabilityMaxDailyPoints;

    protected override int GetDailyPoints(UserStatistic statistic) => statistic.CountabilityPercentage;

    protected override void AddDailyPoints(UserStatistic statistic, int points) =>
        statistic.CountabilityPercentage += points;

    protected override async Task<AiResult<List<GapChoiceDraft>>> GenerateTasksAsync(LanguageLevel level,
        IReadOnlyList<string> knownRules)
    {
        var generated = await AiService.GenerateTasksAsync(level, knownRules);

        if (!generated.IsSuccess)
            return AiResult<List<GapChoiceDraft>>.Failure(generated.ErrorMessage);

        var drafts = (generated.Value.Tasks ?? [])
            .Select(task => new
            {
                Task = task,
                Answer = task.Answer?.Trim(),
                WrongOptions = (task.WrongOptions ?? [])
                    .Select(option => option?.Trim())
                    .Where(option => !string.IsNullOrWhiteSpace(option))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Where(option => !string.Equals(option, task.Answer?.Trim(), StringComparison.OrdinalIgnoreCase))
                    .Take(GeneralConstants.CountabilityMaxOptionsCount - 1)
                    .ToList()
            })
            .Where(item => item.WrongOptions.Count >= GeneralConstants.CountabilityMinOptionsCount - 1)
            .Select(item => new GapChoiceDraft(
                item.Task.Noun?.Trim(),
                item.Task.Sentence?.Trim(),
                item.Answer,
                item.WrongOptions.Append(item.Answer).OrderBy(_ => Random.Shared.Next()).ToList(),
                item.Task.Explanation?.Trim(),
                item.Task.Category?.Trim(),
                item.Task.Rule?.Trim(),
                string.Equals(item.Task.Kind, "dual", StringComparison.OrdinalIgnoreCase)
                    ? GeneralConstants.CountabilityDualMeaningPoints
                    : GeneralConstants.CountabilityCorrectPoints))
            .ToList();

        return AiResult<List<GapChoiceDraft>>.Success(drafts);
    }
}
