using System.Text.RegularExpressions;
using Api.Ai;
using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Api.Requests.Explain;
using Microsoft.EntityFrameworkCore;

namespace Api.Services.BusinessLogic;

public class ExplainService(
    TutorContext dbContext,
    ISecurityContext securityContext,
    IExplainAiService aiService,
    IGuessAiService guessAiService,
    ILanguageSettingsService languageSettingsService)
    : IExplainService
{
    private TutorContext DbContext { get; } = dbContext;
    private Guid UserId { get; } = Guid.Parse(securityContext.GetCurrentUserId());
    private IExplainAiService AiService { get; } = aiService;
    private IGuessAiService GuessAiService { get; } = guessAiService;
    private ILanguageSettingsService LanguageSettingsService { get; } = languageSettingsService;

    public Task<int> CountAvailableWordsAsync(Language language)
    {
        return GetAvailableWords(language).CountAsync();
    }

    public async Task<ExplainExerciseRepresentation> GetExerciseAsync(Language language)
    {
        var wordIds = await GetAvailableWords(language)
            .OrderBy(_ => Guid.NewGuid())
            .Take(GeneralConstants.ExplainExerciseWordsCount)
            .Select(w => w.Id)
            .ToListAsync();

        if (wordIds.Count < GeneralConstants.ExplainExerciseWordsCount)
            return new ExplainExerciseRepresentation();

        var tasks = await DbContext.Words
            .Where(w => wordIds.Contains(w.Id))
            .Select(w => new ExplainTaskRepresentation
            {
                WordId = w.Id,
                Word = w.Value,
                Translations = w.Translations.Where(t => t.UserTranslations.Any(ut => ut.UserId == UserId))
                    .OrderBy(t => t.UserTranslations.First(ut => ut.UserId == UserId).Position)
                    .Select(t => t.Value)
                    .ToList(),
                Usages = w.Usages.Where(u => u.UserUsages.Any(uu => uu.UserId == UserId))
                    .OrderBy(u => u.UserUsages.First(uu => uu.UserId == UserId).Position)
                    .Select(u => u.Value)
                    .ToList()
            })
            .ToListAsync();

        tasks = tasks.OrderBy(task => wordIds.IndexOf(task.WordId)).ToList();

        var level = await LanguageSettingsService.GetLevelAsync(language);

        var described = await GuessAiService.DescribeWordsAsync(language, level,
            tasks.Select(task => new AiGuessWord(task.WordId, task.Word, task.Translations)).ToList());

        if (described.IsSuccess)
        {
            var descriptions = (described.Value.Items ?? [])
                .GroupBy(item => item.Id)
                .ToDictionary(group => group.Key, group => group.First().Description?.Trim());

            foreach (var task in tasks)
                task.ExampleExplanation = descriptions.GetValueOrDefault(task.WordId);
        }

        return new ExplainExerciseRepresentation { Tasks = tasks };
    }

    public async Task<ExplainGuessRepresentation> GuessAsync(GuessExplainRequest request)
    {
        var attempts = request.Attempts ?? [];

        if (attempts.Count >= GeneralConstants.ExplainMaxAttemptsCount)
            return new ExplainGuessRepresentation { Error = "No attempts left for this word." };

        var explanation = Normalize(request.Explanation);

        if (!request.IsGivenUp && explanation.Length == 0)
            return Invalid("Write an explanation first.");

        if (explanation.Length > GeneralConstants.ExplainExplanationMaxLength)
            return Invalid($"Keep the explanation under {GeneralConstants.ExplainExplanationMaxLength} characters.");

        var word = await DbContext.Words
            .Where(w => w.Id == request.WordId
                        && w.Language == request.Language
                        && w.Translations.Any(t => t.UserTranslations.Any(ut => ut.UserId == UserId)))
            .Select(w => new
            {
                w.Value,
                Translations = w.Translations.Where(t => t.UserTranslations.Any(ut => ut.UserId == UserId))
                    .Select(t => t.Value)
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (word == null)
            return new ExplainGuessRepresentation { Error = "The word is missing." };

        if (request.IsGivenUp)
            return await FinishAsync(request, new ExplainGuessRepresentation { IsValid = true, IsFinished = true },
                attempts.Count);

        if (WordLeak.Reveals(explanation, word.Value))
            return Invalid("Don't use the word itself or a word with the same root.");

        if (word.Translations.Any(translation => WordLeak.Reveals(explanation, translation)))
            return Invalid("Don't use a translation of the word - explain it instead.");

        var validationTask = AiService.ValidateExplanationAsync(request.Language, word.Value, word.Translations,
            explanation);
        var guessTask = AiService.GuessWordAsync(request.Language,
            attempts.Select(attempt => new AiExplainAttempt(attempt.Explanation, attempt.Guess)).ToList(),
            explanation);

        await Task.WhenAll(validationTask, guessTask);

        var validation = validationTask.Result;

        if (!validation.IsSuccess)
            return new ExplainGuessRepresentation { Error = validation.ErrorMessage };

        if (!validation.Value.IsValid)
            return Invalid(string.IsNullOrWhiteSpace(validation.Value.Reason)
                ? "This explanation can't be used. Explain the meaning of the word, not its letters."
                : validation.Value.Reason.Trim());

        var guess = guessTask.Result;

        if (!guess.IsSuccess)
            return new ExplainGuessRepresentation { Error = guess.ErrorMessage };

        var guessedWord = Normalize(guess.Value.Guess);
        var isCorrect = Matches(guessedWord, word.Value, request.Language);
        var isFinished = isCorrect || attempts.Count + 1 >= GeneralConstants.ExplainMaxAttemptsCount;

        var result = new ExplainGuessRepresentation
        {
            IsValid = true,
            Guess = guessedWord,
            IsCorrect = isCorrect,
            IsFinished = isFinished
        };

        if (!isFinished)
            return result;

        return await FinishAsync(request, result, attempts.Count);
    }

    private async Task<ExplainGuessRepresentation> FinishAsync(GuessExplainRequest request,
        ExplainGuessRepresentation result, int wrongGuessesCount)
    {
        var isCorrect = result.IsCorrect;

        if (isCorrect)
        {
            result.Points = GeneralConstants.ExplainMaxPoints
                            - (request.IsHintShown ? GeneralConstants.ExplainHintPenaltyPoints : 0)
                            - wrongGuessesCount * GeneralConstants.ExplainWrongGuessPenaltyPoints;

            var statistic = await DbContext.GetOrCreateTodayStatisticAsync(UserId, request.Language);
            statistic.Percentage += result.Points;
        }

        var progress = await DbContext.UserWordLearningProgresses
            .FirstOrDefaultAsync(uwlp => uwlp.UserId == UserId && uwlp.WordId == request.WordId);

        if (progress != null && progress.WordLearningProgress is >= WordLearningProgress.None
                and <= WordLearningProgress.Three)
        {
            progress.LastLearningDate = DateTime.UtcNow;

            if (isCorrect && progress.WordLearningProgress != WordLearningProgress.Three)
                progress.WordLearningProgress++;
            else if (!isCorrect && progress.WordLearningProgress != WordLearningProgress.None)
                progress.WordLearningProgress--;
        }

        await DbContext.SaveChangesAsync();

        result.WordLearningProgress = progress?.WordLearningProgress ?? WordLearningProgress.None;

        return result;
    }

    private static ExplainGuessRepresentation Invalid(string reason) =>
        new() { IsValid = false, Reason = reason };

    private static string Normalize(string value) =>
        Regex.Replace(value?.Trim() ?? string.Empty, @"\s+", " ");

    private static bool Matches(string guess, string word, Language language)
    {
        var normalizedGuess = guess.Trim('.', '!', '?', ',', '"', '\'').ToLowerInvariant();
        var normalizedWord = Normalize(word).ToLowerInvariant();

        if (normalizedGuess == normalizedWord)
            return true;

        return language == Language.English
               && StripInfinitive(normalizedGuess) == StripInfinitive(normalizedWord);
    }

    private static string StripInfinitive(string value) =>
        value.StartsWith("to ") ? value[3..] : value;

    private IQueryable<Word> GetAvailableWords(Language language)
    {
        return DbContext.Words
            .Where(w => w.Language == language
                        && w.Translations.Any(t => t.UserTranslations.Any(ut => ut.UserId == UserId))
                        && w.UserWordLearningProgresses.Any(uwlp =>
                            uwlp.UserId == UserId
                            && (uwlp.WordLearningProgress == WordLearningProgress.One
                                || uwlp.WordLearningProgress == WordLearningProgress.Two
                                || uwlp.WordLearningProgress == WordLearningProgress.Three)));
    }
}
