using Api.Ai;
using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Api.Requests.Mistakes;
using Microsoft.EntityFrameworkCore;

namespace Api.Services.BusinessLogic;

public class MistakesService(
    TutorContext dbContext,
    ISecurityContext securityContext,
    IMistakesAiService aiService,
    ILanguageSettingsService languageSettingsService)
    : IMistakesService
{
    private TutorContext DbContext { get; } = dbContext;
    private Guid UserId { get; } = Guid.Parse(securityContext.GetCurrentUserId());
    private IMistakesAiService AiService { get; } = aiService;
    private ILanguageSettingsService LanguageSettingsService { get; } = languageSettingsService;

    public Task<List<MistakePatternRepresentation>> GetAsync(Language language) =>
        Project(DbContext.UserMistakePatterns
                .AsNoTracking()
                .Where(pattern => pattern.UserId == UserId && pattern.Language == language))
            .OrderBy(pattern => pattern.Progress == MistakeProgress.Ignored)
            .ThenByDescending(pattern => pattern.LastOccurrenceDate)
            .ToListAsync();

    public async Task<MistakePatternRepresentation> UpdateAsync(int patternId,
        UpdateMistakePatternRequest request)
    {
        var pattern = await DbContext.UserMistakePatterns
            .FirstOrDefaultAsync(pattern => pattern.Id == patternId && pattern.UserId == UserId);

        if (pattern == null)
            return null;

        if (request.IsIgnored)
            pattern.Progress = MistakeProgress.Ignored;
        else if (pattern.Progress == MistakeProgress.Ignored)
            pattern.Progress = MistakeProgress.New;

        await DbContext.SaveChangesAsync();

        return await Project(DbContext.UserMistakePatterns
                .AsNoTracking()
                .Where(item => item.Id == patternId))
            .FirstAsync();
    }

    public async Task<bool> DeleteAsync(int patternId)
    {
        var pattern = await DbContext.UserMistakePatterns
            .FirstOrDefaultAsync(pattern => pattern.Id == patternId && pattern.UserId == UserId);

        if (pattern == null)
            return false;

        DbContext.UserMistakePatterns.Remove(pattern);

        await DbContext.SaveChangesAsync();

        return true;
    }

    public Task<int> GetAvailableCountAsync(Language language) =>
        ExerciseCandidates(language).CountAsync();

    public async Task<MistakesExerciseRepresentation> GetExerciseAsync(Language language)
    {
        var selected = await SelectExercisePatternsAsync(language);

        if (selected.Count == 0)
            return new MistakesExerciseRepresentation();

        var rules = selected
            .Select(pattern => new AiMistakeRule(pattern.Id, pattern.Category, pattern.Rule,
                pattern.Examples
                    .Select(example => $"\"{example.Fragment}\" should be \"{example.Correction}\"")
                    .ToList()))
            .ToList();

        var level = await LanguageSettingsService.GetLevelAsync(language);

        var generated = await AiService.GenerateTasksAsync(language, level, rules);

        if (!generated.IsSuccess)
            return new MistakesExerciseRepresentation { Error = generated.ErrorMessage };

        var patterns = selected.ToDictionary(pattern => pattern.Id);

        return new MistakesExerciseRepresentation
        {
            Tasks = (generated.Value.Items ?? [])
                .Where(task => patterns.ContainsKey(task.Id)
                               && !string.IsNullOrWhiteSpace(task.Sentence)
                               && !string.IsNullOrWhiteSpace(task.Fragment)
                               && task.Sentence.Contains(task.Fragment.Trim(), StringComparison.Ordinal)
                               && !string.IsNullOrWhiteSpace(task.CorrectedSentence)
                               && NormalizeSentence(task.CorrectedSentence) != NormalizeSentence(task.Sentence))
                .DistinctBy(task => task.Id)
                .Select(task => new MistakeTaskRepresentation
                {
                    PatternId = task.Id,
                    Category = patterns[task.Id].Category,
                    Rule = patterns[task.Id].Rule,
                    Progress = patterns[task.Id].Progress,
                    Sentence = task.Sentence.Trim(),
                    Fragment = task.Fragment.Trim(),
                    CorrectedSentence = task.CorrectedSentence.Trim(),
                    Explanation = task.Explanation?.Trim(),
                    Example = patterns[task.Id].Examples.FirstOrDefault()
                })
                .ToList()
        };
    }

    public async Task<MistakeAnswerRepresentation> AnswerAsync(int patternId, AnswerMistakeTaskRequest request)
    {
        var pattern = await DbContext.UserMistakePatterns
            .FirstOrDefaultAsync(pattern => pattern.Id == patternId && pattern.UserId == UserId);

        if (pattern == null)
            return null;

        if (request.IsGivenUp)
            return await GiveUpAsync(pattern);

        var sentence = request.Sentence?.Trim();
        var answer = request.Answer?.Trim();

        if (string.IsNullOrWhiteSpace(sentence)
            || sentence.Length > GeneralConstants.ConversationMessageMaxLength)
            return new MistakeAnswerRepresentation { Progress = pattern.Progress, Error = "The task is missing." };

        if (string.IsNullOrWhiteSpace(answer))
            return new MistakeAnswerRepresentation { Progress = pattern.Progress, Error = "Write your answer first." };

        if (answer.Length > GeneralConstants.ConversationMessageMaxLength)
            return new MistakeAnswerRepresentation
            {
                Progress = pattern.Progress,
                Error = $"That is too long. Keep it under {GeneralConstants.ConversationMessageMaxLength} characters."
            };

        var check = IsSameSentence(answer, request.CorrectedSentence)
            ? AiResult<AiMistakeAnswerCheck>.Success(new AiMistakeAnswerCheck
            {
                IsCorrect = true,
                CorrectedSentence = request.CorrectedSentence,
                Explanation = request.Explanation
            })
            : await AiService.CheckAnswerAsync(pattern.Language, pattern.Rule, sentence, answer);

        if (!check.IsSuccess)
            return new MistakeAnswerRepresentation { Progress = pattern.Progress, Error = check.ErrorMessage };

        var isCounted = IsCounted(pattern);

        var points = 0;

        if (isCounted)
        {
            pattern.Progress = NextProgress(pattern.Progress, check.Value.IsCorrect);
            pattern.LastPracticeDate = DateTime.UtcNow;

            if (check.Value.IsCorrect)
            {
                points = request.UsedHint
                    ? GeneralConstants.MistakesExerciseHintPoints
                    : GeneralConstants.MistakesExerciseCorrectPoints;

                var statistic = await DbContext.GetOrCreateTodayStatisticAsync(UserId, pattern.Language);
                statistic.Percentage += points;
            }

            await DbContext.SaveChangesAsync();
        }

        return new MistakeAnswerRepresentation
        {
            IsCorrect = check.Value.IsCorrect,
            CorrectedSentence = check.Value.CorrectedSentence?.Trim(),
            Explanation = check.Value.Explanation?.Trim(),
            Progress = pattern.Progress,
            IsCounted = isCounted,
            Points = points
        };
    }

    private async Task<MistakeAnswerRepresentation> GiveUpAsync(UserMistakePattern pattern)
    {
        var isCounted = IsCounted(pattern);

        if (isCounted)
        {
            pattern.Progress = NextProgress(pattern.Progress, false);
            pattern.LastPracticeDate = DateTime.UtcNow;

            await DbContext.SaveChangesAsync();
        }

        return new MistakeAnswerRepresentation
        {
            IsCorrect = false,
            Progress = pattern.Progress,
            IsCounted = isCounted
        };
    }

    private static bool IsSameSentence(string answer, string correctedSentence) =>
        !string.IsNullOrWhiteSpace(correctedSentence)
        && NormalizeSentence(answer) == NormalizeSentence(correctedSentence);

    private static string NormalizeSentence(string value) =>
        string.Join(' ', new string(value
                .ToLowerInvariant()
                .Replace('’', '\'')
                .Replace('‘', '\'')
                .Select(symbol => char.IsLetterOrDigit(symbol) || symbol == '\'' ? symbol : ' ')
                .ToArray())
            .Split(' ', StringSplitOptions.RemoveEmptyEntries));

    private static bool IsCounted(UserMistakePattern pattern) =>
        pattern.Progress != MistakeProgress.Ignored
        && (pattern.LastPracticeDate == null || pattern.LastPracticeDate < DateTime.UtcNow.Date);

    private IQueryable<UserMistakePattern> ExerciseCandidates(Language language)
    {
        var today = DateTime.UtcNow.Date;
        var reviewBefore = DateTime.UtcNow.AddDays(-GeneralConstants.MistakeMasteredReviewDays);

        return DbContext.UserMistakePatterns
            .AsNoTracking()
            .Where(pattern => pattern.UserId == UserId
                              && pattern.Language == language
                              && pattern.Progress != MistakeProgress.Ignored
                              && (pattern.LastPracticeDate == null || pattern.LastPracticeDate < today)
                              && (pattern.Progress != MistakeProgress.Mastered
                                  || pattern.LastPracticeDate == null
                                  || pattern.LastPracticeDate < reviewBefore));
    }

    private async Task<List<MistakePatternRepresentation>> SelectExercisePatternsAsync(Language language)
    {
        var candidates = await ExerciseCandidates(language)
            .Select(pattern => new
            {
                pattern.Id,
                pattern.Progress,
                pattern.CreatedDate,
                pattern.LastPracticeDate,
                LastOccurrenceDate = pattern.Occurrences.Max(occurrence => (DateTime?)occurrence.CreatedDate)
            })
            .ToListAsync();

        var reviews = candidates
            .Where(pattern => pattern.Progress == MistakeProgress.Mastered)
            .OrderBy(pattern => pattern.LastOccurrenceDate)
            .Take(GeneralConstants.MistakesExerciseMaxReviewsCount)
            .ToList();

        var learning = candidates
            .Where(pattern => pattern.Progress is MistakeProgress.Two or MistakeProgress.One)
            .OrderByDescending(pattern => pattern.Progress)
            .ThenBy(pattern => pattern.LastPracticeDate)
            .ToList();

        var fresh = candidates
            .Where(pattern => pattern.Progress == MistakeProgress.New)
            .OrderBy(pattern => pattern.CreatedDate)
            .ToList();

        var learningCount = GeneralConstants.MistakesExerciseTasksCount - reviews.Count
                            - Math.Min(fresh.Count, GeneralConstants.MistakesExerciseMinNewCount);

        var ids = reviews
            .Concat(learning.Take(learningCount))
            .Concat(fresh)
            .Concat(learning.Skip(learningCount))
            .Take(GeneralConstants.MistakesExerciseTasksCount)
            .Select(pattern => pattern.Id)
            .ToList();

        var patterns = await Project(DbContext.UserMistakePatterns
                .AsNoTracking()
                .Where(pattern => ids.Contains(pattern.Id)))
            .ToListAsync();

        return patterns.OrderBy(pattern => ids.IndexOf(pattern.Id)).ToList();
    }

    private static MistakeProgress NextProgress(MistakeProgress progress, bool isCorrect) =>
        (progress, isCorrect) switch
        {
            (MistakeProgress.New, true) => MistakeProgress.One,
            (MistakeProgress.One, true) => MistakeProgress.Two,
            (MistakeProgress.Two, true) => MistakeProgress.Mastered,
            (MistakeProgress.Mastered, true) => MistakeProgress.Mastered,
            (MistakeProgress.Mastered, false) => MistakeProgress.One,
            (MistakeProgress.Two, false) => MistakeProgress.One,
            _ => MistakeProgress.New
        };

    private static IQueryable<MistakePatternRepresentation> Project(IQueryable<UserMistakePattern> query)
    {
        var today = DateTime.UtcNow.Date;

        return query.Select(pattern => new MistakePatternRepresentation
        {
            Id = pattern.Id,
            Category = pattern.Category,
            Rule = pattern.Rule,
            Progress = pattern.Progress,
            OccurrencesCount = pattern.Occurrences.Count,
            LastOccurrenceDate = pattern.Occurrences.Max(occurrence => (DateTime?)occurrence.CreatedDate),
            CreatedDate = pattern.CreatedDate,
            LastPracticeDate = pattern.LastPracticeDate,
            IsPractisedToday = pattern.LastPracticeDate >= today,
            Examples = pattern.Occurrences
                .OrderByDescending(occurrence => occurrence.CreatedDate)
                .Take(GeneralConstants.MistakeExamplesCount)
                .Select(occurrence => new MistakeOccurrenceRepresentation
                {
                    Fragment = occurrence.Fragment,
                    Correction = occurrence.Correction,
                    Explanation = occurrence.Explanation,
                    CreatedDate = occurrence.CreatedDate
                })
                .ToList()
        });
    }
}
