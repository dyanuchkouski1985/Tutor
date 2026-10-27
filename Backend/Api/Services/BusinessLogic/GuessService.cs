using System.Text.RegularExpressions;
using Api.Ai;
using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Api.Requests.Guess;
using Microsoft.EntityFrameworkCore;

namespace Api.Services.BusinessLogic;

public class GuessService(
    TutorContext dbContext,
    ISecurityContext securityContext,
    IGuessAiService aiService,
    ILanguageSettingsService languageSettingsService)
    : IGuessService
{
    private TutorContext DbContext { get; } = dbContext;
    private Guid UserId { get; } = Guid.Parse(securityContext.GetCurrentUserId());
    private IGuessAiService AiService { get; } = aiService;
    private ILanguageSettingsService LanguageSettingsService { get; } = languageSettingsService;

    public Task<int> CountAvailableWordsAsync(Language language)
    {
        return GetAvailableWords(language).CountAsync();
    }

    public async Task<GuessExerciseRepresentation> GetExerciseAsync(Language language)
    {
        var words = await GetAvailableWords(language)
            .OrderBy(_ => Guid.NewGuid())
            .Take(GeneralConstants.GuessCandidateWordsCount)
            .Select(w => new AiGuessWord(w.Id, w.Value,
                w.Translations.Where(t => t.UserTranslations.Any(ut => ut.UserId == UserId))
                    .OrderBy(t => t.UserTranslations.First(ut => ut.UserId == UserId).Position)
                    .Select(t => t.Value)
                    .ToList()))
            .ToListAsync();

        if (words.Count < GeneralConstants.GuessExerciseWordsCount)
            return new GuessExerciseRepresentation();

        var level = await LanguageSettingsService.GetLevelAsync(language);

        var generated = await AiService.DescribeWordsAsync(language, level, words);

        if (!generated.IsSuccess)
            return new GuessExerciseRepresentation { Error = generated.ErrorMessage };

        var descriptions = (generated.Value.Items ?? [])
            .GroupBy(item => item.Id)
            .ToDictionary(group => group.Key, group => group.First());

        return new GuessExerciseRepresentation
        {
            Tasks = words
                .Select(word => ToTask(word, descriptions.GetValueOrDefault(word.Id)))
                .Where(task => task != null)
                .Take(GeneralConstants.GuessExerciseWordsCount)
                .ToList()
        };
    }

    public async Task<GuessAnswerRepresentation> AnswerAsync(AnswerGuessRequest request)
    {
        var word = await DbContext.Words
            .Where(w => w.Id == request.WordId
                        && w.Language == request.Language
                        && w.Translations.Any(t => t.UserTranslations.Any(ut => ut.UserId == UserId)))
            .Select(w => new
            {
                w.Value,
                Translations = w.Translations.Where(t => t.UserTranslations.Any(ut => ut.UserId == UserId))
                    .OrderBy(t => t.UserTranslations.First(ut => ut.UserId == UserId).Position)
                    .Select(t => t.Value)
                    .ToList(),
                Usages = w.Usages.Where(u => u.UserUsages.Any(uu => uu.UserId == UserId))
                    .OrderBy(u => u.UserUsages.First(uu => uu.UserId == UserId).Position)
                    .Select(u => u.Value)
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (word == null)
            return new GuessAnswerRepresentation { Error = "The word is missing." };

        var isCorrect = string.Equals(Normalize(request.Answer), Normalize(word.Value),
            StringComparison.InvariantCultureIgnoreCase);

        var points = 0;

        if (isCorrect)
        {
            points = Math.Max(GeneralConstants.GuessMinPoints, GeneralConstants.GuessMaxPoints
                - Math.Clamp(request.RevealedHintsCount, 0, GeneralConstants.GuessMaxHintsCount)
                * GeneralConstants.GuessHintPenaltyPoints);

            var statistic = await DbContext.GetOrCreateTodayStatisticAsync(UserId, request.Language);
            statistic.Percentage += points;
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

        return new GuessAnswerRepresentation
        {
            IsCorrect = isCorrect,
            Word = word.Value,
            Translations = word.Translations,
            Usages = word.Usages,
            WordLearningProgress = progress?.WordLearningProgress ?? WordLearningProgress.None,
            Points = points
        };
    }

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

    private static string Normalize(string value) =>
        Regex.Replace(value?.Trim() ?? string.Empty, @"\s+", " ");

    private static GuessTaskRepresentation ToTask(AiGuessWord word, AiGuessDescription description)
    {
        var text = description?.Description?.Trim();
        var example = description?.Example?.Trim();

        if (string.IsNullOrEmpty(example) || WordLeak.Reveals(example, word.Word))
            example = null;

        if (string.IsNullOrEmpty(text) || WordLeak.Reveals(text, word.Word))
        {
            text = example;
            example = null;
        }

        if (string.IsNullOrEmpty(text))
            return null;

        return new GuessTaskRepresentation
        {
            WordId = word.Id,
            Description = text,
            Example = example,
            Letters = word.Word.Select(letter => letter.ToString()).OrderBy(_ => Random.Shared.Next()).ToList()
        };
    }
}
