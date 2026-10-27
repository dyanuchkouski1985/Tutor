using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Api.Ai;
using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Api.Requests.VerbForms;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Caching.Memory;

namespace Api.Services.BusinessLogic;

public class VerbFormsService(
    TutorContext dbContext,
    ISecurityContext securityContext,
    IVerbFormsAiService aiService,
    ILanguageSettingsService languageSettingsService,
    IDataProtectionProvider dataProtectionProvider,
    IMemoryCache memoryCache)
    : IVerbFormsService
{
    private const string brokenTasksMessage = "The tasks came out broken. Please try again.";

    private static readonly Regex baseFormHint =
        new($@"{Regex.Escape(GeneralConstants.GapPlaceholder)}\s*\([^)]*\)", RegexOptions.Compiled);

    private TutorContext DbContext { get; } = dbContext;
    private Guid UserId { get; } = Guid.Parse(securityContext.GetCurrentUserId());
    private IVerbFormsAiService AiService { get; } = aiService;
    private ILanguageSettingsService LanguageSettingsService { get; } = languageSettingsService;

    private ITimeLimitedDataProtector Protector { get; } = dataProtectionProvider
        .CreateProtector("VerbForms.AnswerKey")
        .ToTimeLimitedDataProtector();

    private IMemoryCache MemoryCache { get; } = memoryCache;

    public static bool IsSupported(Language language) => language == Language.English;

    public async Task<VerbFormsExerciseRepresentation> GetExerciseAsync(Language language)
    {
        if (!IsSupported(language))
            return new VerbFormsExerciseRepresentation();

        var level = await LanguageSettingsService.GetLevelAsync(language);
        var knownRules = await DbContext.GetKnownMistakeRulesAsync(UserId, language);

        var generated = await AiService.GenerateTasksAsync(level, knownRules);

        if (!generated.IsSuccess)
            return new VerbFormsExerciseRepresentation { Error = generated.ErrorMessage };

        return BuildExercise(generated.Value) ??
               new VerbFormsExerciseRepresentation { Error = brokenTasksMessage };
    }

    public async Task<VerbFormsAnswerRepresentation> AnswerAsync(AnswerVerbFormsRequest request)
    {
        var key = ReadKey(request.Key);

        if (key == null || key.UserId != UserId)
            return new VerbFormsAnswerRepresentation { Error = "These tasks have expired. Start new ones." };

        if (request.TaskIndex < 0 || request.TaskIndex >= key.Tasks.Count)
            return new VerbFormsAnswerRepresentation { Error = "The task is missing." };

        var task = key.Tasks[request.TaskIndex];
        var answer = Normalize(request.Answer);
        var isCorrect = answer.Length > 0 &&
                        task.Answers.Any(form => string.Equals(form, answer, StringComparison.OrdinalIgnoreCase));

        var cacheKey = $"verb-forms:{key.Id}:{request.TaskIndex}";
        var isRepeated = MemoryCache.TryGetValue(cacheKey, out _);

        if (!isRepeated)
            MemoryCache.Set(cacheKey, true, TimeSpan.FromMinutes(GeneralConstants.VerbFormsKeyLifetimeMinutes));

        var points = 0;

        if (!isRepeated)
        {
            if (isCorrect)
            {
                var statistic = await DbContext.GetOrCreateTodayStatisticAsync(UserId, request.Language);

                points = Math.Clamp(GeneralConstants.VerbFormsMaxDailyPoints - statistic.VerbFormsPercentage,
                    0, GeneralConstants.VerbFormsCorrectPoints);

                statistic.Percentage += points;
                statistic.VerbFormsPercentage += points;
            }
            else if (answer.Length > 0)
            {
                var sentence = baseFormHint.Replace(task.Sentence, GeneralConstants.GapPlaceholder);

                await DbContext.RecordMistakesAsync(UserId, request.Language, null,
                [
                    new AiValidationError
                    {
                        Fragment = GapSentence.Fill(sentence, answer),
                        Correction = GapSentence.Fill(sentence, task.Answers[0]),
                        Explanation = task.Explanation,
                        Category = task.Category,
                        Rule = task.Rule
                    }
                ]);
            }

            await DbContext.SaveChangesAsync();
        }

        return new VerbFormsAnswerRepresentation
        {
            IsCorrect = isCorrect,
            CorrectAnswer = isCorrect
                ? task.Answers.First(form => string.Equals(form, answer, StringComparison.OrdinalIgnoreCase))
                : task.Answers[0],
            Explanation = task.Explanation,
            Forms = task.Forms ?? [],
            Points = points
        };
    }

    private VerbFormsExerciseRepresentation BuildExercise(AiVerbFormTasks generated)
    {
        var tasks = (generated.Tasks ?? [])
            .Select(task => new
            {
                Verb = task.Verb?.Trim(),
                Forms = new[] { task.Verb, task.PastSimple, task.PastParticiple }
                    .Select(form => form?.Trim())
                    .ToList(),
                Sentence = task.Sentence?.Trim(),
                Answers = (task.Answers ?? [])
                    .Select(Normalize)
                    .Where(form => form.Length > 0 && !form.Contains(' '))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(GeneralConstants.VerbFormsMaxAnswersCount)
                    .ToList(),
                Explanation = task.Explanation?.Trim(),
                Category = task.Category?.Trim(),
                Rule = task.Rule?.Trim()
            })
            .Where(task => !string.IsNullOrWhiteSpace(task.Verb)
                           && task.Answers.Count > 0
                           && GapSentence.HasSingleGap(task.Sentence))
            .DistinctBy(task => task.Verb, StringComparer.OrdinalIgnoreCase)
            .Take(GeneralConstants.VerbFormsTasksCount)
            .ToList();

        if (tasks.Count == 0)
            return null;

        return new VerbFormsExerciseRepresentation
        {
            Tasks = tasks
                .Select(task => new VerbFormsTaskRepresentation { Verb = task.Verb, Sentence = task.Sentence })
                .ToList(),
            Key = WriteKey(new VerbFormsKey(Guid.NewGuid(), UserId,
                tasks
                    .Select(task => new VerbFormsKeyTask(task.Sentence, task.Answers,
                        task.Forms.All(form => !string.IsNullOrEmpty(form)) ? task.Forms : [],
                        task.Explanation, task.Category, task.Rule))
                    .ToList()))
        };
    }

    private static string Normalize(string value)
    {
        var trimmed = value?.Trim() ?? string.Empty;

        if (trimmed.Length > GeneralConstants.VerbFormsAnswerMaxLength)
            trimmed = trimmed[..GeneralConstants.VerbFormsAnswerMaxLength];

        return string.Join(' ', trimmed.Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private string WriteKey(VerbFormsKey key) =>
        Protector.Protect(JsonSerializer.Serialize(key),
            TimeSpan.FromMinutes(GeneralConstants.VerbFormsKeyLifetimeMinutes));

    private VerbFormsKey ReadKey(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        try
        {
            return JsonSerializer.Deserialize<VerbFormsKey>(Protector.Unprotect(value));
        }
        catch (Exception exception) when (exception is CryptographicException or JsonException or FormatException)
        {
            return null;
        }
    }

    private sealed record VerbFormsKey(Guid Id, Guid UserId, List<VerbFormsKeyTask> Tasks);

    private sealed record VerbFormsKeyTask(string Sentence, List<string> Answers, List<string> Forms,
        string Explanation, string Category, string Rule);
}
