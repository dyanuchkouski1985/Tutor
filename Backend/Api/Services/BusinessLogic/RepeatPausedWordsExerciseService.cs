using Api.Constants;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Requests.ExerciseWords;
using Api.Enums;
using Api.Representations;
using Microsoft.EntityFrameworkCore;

namespace Api.Services.BusinessLogic;

public class RepeatPausedWordsExerciseService(TutorContext dbContext, ISecurityContext securityContext)
    : IRepeatPausedWordsExerciseService
{
    private TutorContext dbContext { get; } = dbContext;
    private Guid userId { get; } = Guid.Parse(securityContext.GetCurrentUserId());

    public async Task<List<TranslationsWordRepresentation>> GetAsync(GetExerciseWordsRequest request)
    {
        var query =
            from w in dbContext.Words
                .Where(w => w.Language == request.Language
                            && w.Translations.Any(t =>
                                t.UserTranslations.Any(ut => ut.UserId == userId)))
            from uwlp in dbContext.UserWordLearningProgresses
                .Where(uwlp =>
                    uwlp.WordId == w.Id && uwlp.UserId == userId &&
                    (uwlp.WordLearningProgress == WordLearningProgress.Paused &&
                    uwlp.LastLearningDate < DateTime.Now.AddDays(-GeneralConstants.RepeatWordsLearnedGreaterThanDays) ||
                    uwlp.WordLearningProgress == WordLearningProgress.Completed &&
                    uwlp.LastLearningDate < DateTime.Now.AddDays(-GeneralConstants.CompletedWordsLearnedGreaterThanDays)))
                .DefaultIfEmpty()
            where uwlp.WordLearningProgress == WordLearningProgress.Paused ||
                  uwlp.WordLearningProgress == WordLearningProgress.Completed
            orderby uwlp.LastLearningDate
            select new
            {
                WordId = w.Id,
                Word = w.Value,
                WordLearningProgress = uwlp == null ? WordLearningProgress.None : uwlp.WordLearningProgress,
                LastLearningDate = uwlp == null ? DateTime.MinValue : uwlp.LastLearningDate,
                Translations = w.Translations.Where(t => t.UserTranslations.Any(ut => ut.UserId == userId))
                    .OrderBy(t => t.UserTranslations.First(ut => ut.UserId == userId).Position).Select(t => t.Value)
                    .ToList(),
                PictureIds = w.Pictures.Where(p => p.UserPictures.Any(up => up.UserId == userId))
                    .OrderBy(p => p.UserPictures.First(up => up.UserId == userId).Position).Select(p => p.Id)
                    .ToList(),
                Usages = w.Usages.Where(u => u.UserUsages.Any(uu => uu.UserId == userId))
                    .OrderBy(u => u.UserUsages.First(uu => uu.UserId == userId).Position).Select(u => u.Value)
                    .ToList(),
                IsAnyNewPictureAvailable = w.Pictures.Any() && w.Pictures.All(p => p.UserPictures.All(up => up.UserId != userId))
            };

        Task<List<TranslationsWordRepresentation>> GetExerciseWordsAsync(WordLearningProgress? progress, int count)
        {
            return query
                .Where(q => q.WordLearningProgress == progress)
                .Take(count)
                .Select(q =>
                    new TranslationsWordRepresentation
                    {
                        WordId = q.WordId,
                        Word = q.Word,
                        WordLearningProgress = q.WordLearningProgress,
                        Translations = q.Translations,
                        PictureIds = q.PictureIds,
                        Usages = q.Usages,
                        IsAnyNewPictureAvailable = q.IsAnyNewPictureAvailable
                    }).ToListAsync();
        }

        var completedWords = await GetExerciseWordsAsync(WordLearningProgress.Completed,
            GeneralConstants.RepeatWordsExerciseCompletedWordsCount);
        var pausedWords = await GetExerciseWordsAsync(WordLearningProgress.Paused,
            GeneralConstants.RepeatWordsExerciseWordsCount - completedWords.Count);
        if (completedWords.Count + pausedWords.Count < GeneralConstants.RepeatWordsExerciseWordsCount)
            completedWords = await GetExerciseWordsAsync(WordLearningProgress.Completed,
                GeneralConstants.RepeatWordsExerciseWordsCount - pausedWords.Count);

        var result = completedWords
            .Union(pausedWords)
            .ToList();

        return result.Count < GeneralConstants.RepeatWordsExerciseWordsCount ? [] : result;
    }

    public Task<int> CountAvailableWordsAsync(Language language)
    {
        var pausedBefore = DateTime.Now.AddDays(-GeneralConstants.RepeatWordsLearnedGreaterThanDays);
        var completedBefore = DateTime.Now.AddDays(-GeneralConstants.CompletedWordsLearnedGreaterThanDays);

        return dbContext.Words.CountAsync(w =>
            w.Language == language
            && w.Translations.Any(t => t.UserTranslations.Any(ut => ut.UserId == userId))
            && w.UserWordLearningProgresses.Any(uwlp =>
                uwlp.UserId == userId
                && (uwlp.WordLearningProgress == WordLearningProgress.Paused && uwlp.LastLearningDate < pausedBefore
                    || uwlp.WordLearningProgress == WordLearningProgress.Completed
                    && uwlp.LastLearningDate < completedBefore)));
    }

    public async Task PutAsync(List<PutExerciseWordResult> exerciseResults)
    {
        var language =
            (await dbContext.Words.FirstOrDefaultAsync(w => w.Id == exerciseResults.First().WordId))?.Language ??
            Language.English;
        var userStatistic = await dbContext.GetOrCreateTodayStatisticAsync(userId, language);

        var wordIds = exerciseResults.Select(r => r.WordId).Distinct().ToList();
        var userWordLearningProgresses = await dbContext.UserWordLearningProgresses
            .Where(uwlp => uwlp.UserId == userId && wordIds.Contains(uwlp.WordId)).ToListAsync();
        foreach (var exerciseWordResult in exerciseResults)
        {
            var userWordLearningProgress =
                userWordLearningProgresses.FirstOrDefault(ut => ut.WordId == exerciseWordResult.WordId);
            if (userWordLearningProgress == null)
            {
                userWordLearningProgress = new UserWordLearningProgress
                {
                    UserId = userId,
                    WordId = exerciseWordResult.WordId,
                    AddingDate = DateTime.UtcNow,
                    WordLearningProgress = WordLearningProgress.None
                };
                await dbContext.UserWordLearningProgresses.AddAsync(userWordLearningProgress);
            }

            userWordLearningProgress.LastLearningDate = DateTime.UtcNow;

            if (exerciseWordResult.IsCorrectAnswer)
            {
                if (userStatistic.HasRepeatHalfPoint)
                    userStatistic.Percentage += GeneralConstants.RepeatWordsCorrectAnswerPoints;
                userStatistic.HasRepeatHalfPoint = !userStatistic.HasRepeatHalfPoint;
            }
            else
                userWordLearningProgress.WordLearningProgress = WordLearningProgress.Two;
        }

        await dbContext.SaveChangesAsync();
    }
}