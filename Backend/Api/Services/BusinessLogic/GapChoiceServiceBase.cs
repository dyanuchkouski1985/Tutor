using System.Security.Cryptography;
using System.Text.Json;
using Api.Ai;
using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Api.Requests.GapChoice;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Caching.Memory;

namespace Api.Services.BusinessLogic;

public abstract class GapChoiceServiceBase(
    TutorContext dbContext,
    ISecurityContext securityContext,
    ILanguageSettingsService languageSettingsService,
    IDataProtectionProvider dataProtectionProvider,
    IMemoryCache memoryCache,
    string name)
{
    private const string brokenTasksMessage = "The tasks came out broken. Please try again.";
    protected const string NoWordOption = "—";

    private TutorContext DbContext { get; } = dbContext;
    private Guid UserId { get; } = Guid.Parse(securityContext.GetCurrentUserId());
    private ILanguageSettingsService LanguageSettingsService { get; } = languageSettingsService;

    private ITimeLimitedDataProtector Protector { get; } = dataProtectionProvider
        .CreateProtector($"{name}.AnswerKey")
        .ToTimeLimitedDataProtector();

    private IMemoryCache MemoryCache { get; } = memoryCache;
    private string CachePrefix { get; } = name.ToLowerInvariant();

    protected abstract int TasksCount { get; }
    protected abstract int MaxDailyPoints { get; }

    protected abstract Task<AiResult<List<GapChoiceDraft>>> GenerateTasksAsync(LanguageLevel level,
        IReadOnlyList<string> knownRules);

    protected abstract int GetDailyPoints(UserStatistic statistic);
    protected abstract void AddDailyPoints(UserStatistic statistic, int points);

    public static bool IsSupported(Language language) => language == Language.English;

    public async Task<GapChoiceExerciseRepresentation> GetExerciseAsync(Language language)
    {
        if (!IsSupported(language))
            return new GapChoiceExerciseRepresentation();

        var level = await LanguageSettingsService.GetLevelAsync(language);
        var knownRules = await DbContext.GetKnownMistakeRulesAsync(UserId, language);

        var generated = await GenerateTasksAsync(level, knownRules);

        if (!generated.IsSuccess)
            return new GapChoiceExerciseRepresentation { Error = generated.ErrorMessage };

        return BuildExercise(generated.Value) ??
               new GapChoiceExerciseRepresentation { Error = brokenTasksMessage };
    }

    public async Task<GapChoiceAnswerRepresentation> AnswerAsync(AnswerGapChoiceRequest request)
    {
        var key = ReadKey(request.Key);

        if (key == null || key.UserId != UserId)
            return new GapChoiceAnswerRepresentation { Error = "These tasks have expired. Start new ones." };

        if (request.TaskIndex < 0 || request.TaskIndex >= key.Tasks.Count)
            return new GapChoiceAnswerRepresentation { Error = "The task is missing." };

        var task = key.Tasks[request.TaskIndex];
        var isCorrect = request.Answer == task.CorrectOption;

        var cacheKey = $"{CachePrefix}:{key.Id}:{request.TaskIndex}";
        var isRepeated = MemoryCache.TryGetValue(cacheKey, out _);

        if (!isRepeated)
            MemoryCache.Set(cacheKey, true, TimeSpan.FromMinutes(GeneralConstants.GapChoiceKeyLifetimeMinutes));

        var points = 0;

        if (!isRepeated)
        {
            if (isCorrect)
            {
                var statistic = await DbContext.GetOrCreateTodayStatisticAsync(UserId, request.Language);

                points = Math.Clamp(MaxDailyPoints - GetDailyPoints(statistic), 0, task.Points);

                statistic.Percentage += points;
                AddDailyPoints(statistic, points);
            }
            else if (request.Answer >= 0 && request.Answer < task.Options.Count)
            {
                await DbContext.RecordMistakesAsync(UserId, request.Language, null,
                [
                    new AiValidationError
                    {
                        Fragment = FillGap(task.Sentence, task.Options[request.Answer]),
                        Correction = FillGap(task.Sentence, task.Options[task.CorrectOption]),
                        Explanation = task.Explanation,
                        Category = task.Category,
                        Rule = task.Rule
                    }
                ]);
            }

            await DbContext.SaveChangesAsync();
        }

        return new GapChoiceAnswerRepresentation
        {
            IsCorrect = isCorrect,
            CorrectOption = task.CorrectOption,
            Explanation = task.Explanation,
            Points = points
        };
    }

    private GapChoiceExerciseRepresentation BuildExercise(List<GapChoiceDraft> drafts)
    {
        var tasks = (drafts ?? [])
            .Where(task => !string.IsNullOrWhiteSpace(task.Noun)
                           && !string.IsNullOrWhiteSpace(task.Answer)
                           && GapSentence.HasSingleGap(task.Sentence)
                           && task.Options.Contains(task.Answer))
            .DistinctBy(task => task.Noun, StringComparer.OrdinalIgnoreCase)
            .Take(TasksCount)
            .ToList();

        if (tasks.Count == 0)
            return null;

        return new GapChoiceExerciseRepresentation
        {
            Tasks = tasks
                .Select(task => new GapChoiceTaskRepresentation
                {
                    Noun = task.Noun,
                    Sentence = task.Sentence,
                    Options = task.Options
                })
                .ToList(),
            Key = WriteKey(new GapChoiceKey(Guid.NewGuid(), UserId, tasks
                .Select(task => new GapChoiceKeyTask(task.Sentence, task.Options, task.Options.IndexOf(task.Answer),
                    task.Explanation, task.Category, task.Rule, task.Points))
                .ToList()))
        };
    }

    private static string FillGap(string sentence, string option) =>
        GapSentence.Fill(sentence, option == NoWordOption ? string.Empty : option);

    private string WriteKey(GapChoiceKey key) =>
        Protector.Protect(JsonSerializer.Serialize(key),
            TimeSpan.FromMinutes(GeneralConstants.GapChoiceKeyLifetimeMinutes));

    private GapChoiceKey ReadKey(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        try
        {
            return JsonSerializer.Deserialize<GapChoiceKey>(Protector.Unprotect(value));
        }
        catch (Exception exception) when (exception is CryptographicException or JsonException or FormatException)
        {
            return null;
        }
    }

    protected sealed record GapChoiceDraft(string Noun, string Sentence, string Answer, List<string> Options,
        string Explanation, string Category, string Rule, int Points);

    private sealed record GapChoiceKey(Guid Id, Guid UserId, List<GapChoiceKeyTask> Tasks);

    private sealed record GapChoiceKeyTask(string Sentence, List<string> Options, int CorrectOption,
        string Explanation, string Category, string Rule, int Points);
}
