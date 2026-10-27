using Api.Ai;
using Api.Constants;
using Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace Api.Models;

public static class UserMistakeExtensions
{
    public static Task<List<string>> GetKnownMistakeRulesAsync(this TutorContext dbContext, Guid userId,
        Language language) =>
        dbContext.UserMistakePatterns
            .AsNoTracking()
            .Where(pattern => pattern.UserId == userId && pattern.Language == language)
            .OrderByDescending(pattern => pattern.Occurrences.Max(occurrence => (DateTime?)occurrence.CreatedDate))
            .Select(pattern => pattern.Rule)
            .Take(GeneralConstants.MistakeKnownRulesMaxCount)
            .ToListAsync();

    public static async Task RecordMistakesAsync(this TutorContext dbContext, Guid userId, Language language,
        ConversationMessage message, List<AiValidationError> errors)
    {
        var items = (errors ?? [])
            .Select(error => new
            {
                Error = error,
                Rule = Truncate(error.Rule?.Trim(), GeneralConstants.MistakeRuleMaxLength)
            })
            .Where(item => !string.IsNullOrWhiteSpace(item.Rule)
                           && !string.IsNullOrWhiteSpace(item.Error.Fragment)
                           && !string.IsNullOrWhiteSpace(item.Error.Correction))
            .ToList();

        if (items.Count == 0)
            return;

        var rules = items.Select(item => item.Rule).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

        var patterns = new Dictionary<string, UserMistakePattern>(StringComparer.OrdinalIgnoreCase);

        foreach (var pattern in await dbContext.UserMistakePatterns
                     .Where(pattern => pattern.UserId == userId
                                       && pattern.Language == language
                                       && rules.Contains(pattern.Rule))
                     .ToListAsync())
        {
            if (!patterns.TryAdd(pattern.Rule, pattern))
                continue;

            pattern.Progress = pattern.Progress switch
            {
                MistakeProgress.Ignored => MistakeProgress.Ignored,
                MistakeProgress.Mastered => MistakeProgress.Two,
                MistakeProgress.Two => MistakeProgress.One,
                _ => MistakeProgress.New
            };
        }

        foreach (var item in items)
        {
            if (!patterns.TryGetValue(item.Rule, out var pattern))
            {
                pattern = new UserMistakePattern
                {
                    UserId = userId,
                    Language = language,
                    Category = Truncate(string.IsNullOrWhiteSpace(item.Error.Category)
                        ? "other"
                        : item.Error.Category.Trim(), GeneralConstants.MistakeCategoryMaxLength),
                    Rule = item.Rule,
                    Progress = MistakeProgress.New,
                    CreatedDate = DateTime.UtcNow
                };

                dbContext.UserMistakePatterns.Add(pattern);
                patterns[item.Rule] = pattern;
            }

            pattern.Occurrences.Add(new UserMistakeOccurrence
            {
                Message = message,
                Fragment = Truncate(item.Error.Fragment.Trim(), GeneralConstants.ConversationMessageMaxLength),
                Correction = Truncate(item.Error.Correction.Trim(), GeneralConstants.ConversationMessageMaxLength),
                Explanation = Truncate(item.Error.Explanation?.Trim(), GeneralConstants.MistakeExplanationMaxLength),
                CreatedDate = DateTime.UtcNow
            });
        }
    }

    private static string Truncate(string value, int maxLength) =>
        string.IsNullOrEmpty(value) || value.Length <= maxLength ? value : value[..maxLength];
}
