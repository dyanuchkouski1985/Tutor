using Api.Ai;
using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Caching.Memory;

namespace Api.Services.BusinessLogic;

public class ArticlesService(
    TutorContext dbContext,
    ISecurityContext securityContext,
    IArticlesAiService aiService,
    ILanguageSettingsService languageSettingsService,
    IDataProtectionProvider dataProtectionProvider,
    IMemoryCache memoryCache)
    : GapChoiceServiceBase(dbContext, securityContext, languageSettingsService, dataProtectionProvider, memoryCache,
        "Articles"), IArticlesService
{
    private const string articleCategory = "article";

    private static readonly string[] Options = ["a", "an", "the", NoWordOption];

    private IArticlesAiService AiService { get; } = aiService;

    protected override int TasksCount => GeneralConstants.ArticlesTasksCount;
    protected override int MaxDailyPoints => GeneralConstants.ArticlesMaxDailyPoints;

    protected override int GetDailyPoints(UserStatistic statistic) => statistic.ArticlesPercentage;

    protected override void AddDailyPoints(UserStatistic statistic, int points) =>
        statistic.ArticlesPercentage += points;

    protected override async Task<AiResult<List<GapChoiceDraft>>> GenerateTasksAsync(LanguageLevel level,
        IReadOnlyList<string> knownRules)
    {
        var generated = await AiService.GenerateTasksAsync(level, knownRules);

        if (!generated.IsSuccess)
            return AiResult<List<GapChoiceDraft>>.Failure(generated.ErrorMessage);

        var drafts = (generated.Value.Tasks ?? [])
            .Where(task => GapSentence.HasSingleGap(task.Sentence)
                           && GapSentence.FillsTo(task.Sentence,
                               task.Answer?.Trim() == NoWordOption ? string.Empty : task.Answer?.Trim(),
                               RemoveNoWord(task.CorrectSentence)))
            .Select(task => new GapChoiceDraft(
                task.Noun?.Trim(),
                task.Sentence?.Trim(),
                task.Answer?.Trim().ToLowerInvariant(),
                [..Options],
                task.Explanation?.Trim(),
                articleCategory,
                task.Rule?.Trim(),
                string.Equals(task.Kind, "tricky", StringComparison.OrdinalIgnoreCase)
                    ? GeneralConstants.ArticlesTrickyPoints
                    : GeneralConstants.ArticlesCorrectPoints))
            .Where(draft => !string.IsNullOrWhiteSpace(draft.Noun)
                            && GapSentence.HasSingleGap(draft.Sentence)
                            && GapSentence.HasWordAfterGap(draft.Sentence, draft.Noun))
            .ToList();

        return AiResult<List<GapChoiceDraft>>.Success(drafts);
    }

    private static string RemoveNoWord(string sentence) =>
        sentence == null
            ? null
            : string.Join(' ', sentence.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(word => word != NoWordOption));
}
