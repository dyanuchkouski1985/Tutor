using Api.Ai;
using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Api.Requests.SentenceTranslation;

namespace Api.Services.BusinessLogic;

public class SentenceTranslationService(
    TutorContext dbContext,
    ISecurityContext securityContext,
    ISentenceTranslationAiService aiService,
    ILanguageSettingsService languageSettingsService)
    : ISentenceTranslationService
{
    private TutorContext DbContext { get; } = dbContext;
    private Guid UserId { get; } = Guid.Parse(securityContext.GetCurrentUserId());
    private ISentenceTranslationAiService AiService { get; } = aiService;
    private ILanguageSettingsService LanguageSettingsService { get; } = languageSettingsService;

    public async Task<SentenceTranslationExerciseRepresentation> GetExerciseAsync(Language language,
        TranslationLanguage sentenceLanguage, int? count)
    {
        var tasksCount = Math.Clamp(count ?? GeneralConstants.SentenceTranslationTasksCount, 1,
            GeneralConstants.SentenceTranslationTasksCount);

        var level = await LanguageSettingsService.GetLevelAsync(language);

        var generated = await AiService.GenerateSentencesAsync(language, level, sentenceLanguage, tasksCount);

        if (!generated.IsSuccess)
            return new SentenceTranslationExerciseRepresentation { Error = generated.ErrorMessage };

        return new SentenceTranslationExerciseRepresentation
        {
            Tasks = (generated.Value.Items ?? [])
                .Where(task => !string.IsNullOrWhiteSpace(task.Sentence))
                .Take(tasksCount)
                .Select(task => new SentenceTranslationTaskRepresentation
                {
                    Sentence = task.Sentence.Trim(),
                    Translation = task.Translation?.Trim(),
                    Hints = GetValidHints(task)
                })
                .ToList()
        };
    }

    public async Task<SentenceTranslationAnswerRepresentation> AnswerAsync(
        AnswerSentenceTranslationRequest request)
    {
        var sentence = request.Sentence?.Trim();
        var answer = request.Answer?.Trim();

        if (string.IsNullOrWhiteSpace(sentence)
            || sentence.Length > GeneralConstants.ConversationMessageMaxLength)
            return new SentenceTranslationAnswerRepresentation { Error = "The task is missing." };

        if (string.IsNullOrWhiteSpace(answer))
            return new SentenceTranslationAnswerRepresentation { Error = "Write your answer first." };

        if (answer.Length > GeneralConstants.ConversationMessageMaxLength)
            return new SentenceTranslationAnswerRepresentation
            {
                Error = $"That is too long. Keep it under {GeneralConstants.ConversationMessageMaxLength} characters."
            };

        var knownRules = await DbContext.GetKnownMistakeRulesAsync(UserId, request.Language);

        var check = await AiService.CheckAnswerAsync(request.Language, sentence, answer, knownRules);

        if (!check.IsSuccess)
            return new SentenceTranslationAnswerRepresentation { Error = check.ErrorMessage };

        var points = GetPoints(check.Value, request.RevealedHintsCount);

        if (points > 0)
        {
            var statistic = await DbContext.GetOrCreateTodayStatisticAsync(UserId, request.Language);
            statistic.Percentage += points;
        }

        await DbContext.RecordMistakesAsync(UserId, request.Language, null,
            (check.Value.Errors ?? []).Take(GeneralConstants.ConversationMaxValidationErrorsCount).ToList());

        await DbContext.SaveChangesAsync();

        return new SentenceTranslationAnswerRepresentation
        {
            IsCorrect = check.Value.IsMeaningCorrect,
            NaturalTranslation = check.Value.NaturalTranslation?.Trim(),
            Explanation = check.Value.Explanation?.Trim(),
            Points = points
        };
    }

    private static List<SentenceTranslationHintRepresentation> GetValidHints(AiSentenceTask task)
    {
        return (task.Hints ?? [])
            .Select(hint => new SentenceTranslationHintRepresentation
            {
                Fragment = hint.Fragment?.Trim(),
                Translation = hint.Translation?.Trim()
            })
            .Where(hint => !string.IsNullOrEmpty(hint.Fragment)
                           && !string.IsNullOrEmpty(hint.Translation)
                           && task.Sentence.Contains(hint.Fragment, StringComparison.OrdinalIgnoreCase))
            .DistinctBy(hint => hint.Fragment, StringComparer.OrdinalIgnoreCase)
            .Take(GeneralConstants.SentenceTranslationMaxHintsCount)
            .ToList();
    }

    private static int GetPoints(AiSentenceAnswerCheck check, int revealedHintsCount)
    {
        if (!check.IsMeaningCorrect)
            return 0;

        var hintsPenalty = Math.Clamp(revealedHintsCount, 0, GeneralConstants.SentenceTranslationMaxHintsCount)
                           * GeneralConstants.SentenceTranslationHintPenaltyPoints;

        return Math.Clamp(check.Points - hintsPenalty, GeneralConstants.SentenceTranslationMinPoints,
            GeneralConstants.SentenceTranslationMaxPoints);
    }
}
