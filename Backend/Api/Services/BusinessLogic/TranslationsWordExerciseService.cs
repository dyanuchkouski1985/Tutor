using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Requests.ExerciseWords;
using Api.Enums;
using Api.Representations;
using Microsoft.EntityFrameworkCore;
using Api.Constants;

namespace Api.Services.BusinessLogic;

public class TranslationsWordExerciseService(TutorContext dbContext, ISecurityContext securityContext)
    : ITranslationsWordExerciseService
{
    private TutorContext dbContext { get; } = dbContext;
    private Guid userId { get; } = Guid.Parse(securityContext.GetCurrentUserId());

    public async Task<List<TranslationsWordRepresentation>> GetAsync(GetExerciseWordsRequest request)
    {
        List<TranslationsWordRepresentation> result = [];

        var query =
            from w in dbContext.Words
                .Where(w => w.Language == request.Language
                            && w.Translations.Any() && w.Translations.Any(t =>
                                t.UserTranslations.Count > 0 &&
                                t.UserTranslations.Any(ut => ut.UserId == userId)))
            from uwlp in dbContext.UserWordLearningProgresses
                .Where(uwlp =>
                    uwlp.WordId == w.Id && uwlp.UserId == userId).DefaultIfEmpty()
            where uwlp.WordLearningProgress == WordLearningProgress.None || uwlp.WordLearningProgress == WordLearningProgress.One
                || uwlp.WordLearningProgress == WordLearningProgress.Two || uwlp.WordLearningProgress == WordLearningProgress.Three
            select new
            {
                WordId = w.Id,
                Word = w.Value,
                WordLearningProgress = uwlp == null ? WordLearningProgress.None : uwlp.WordLearningProgress,
                LastLearningDate = uwlp == null ? DateTime.MinValue : uwlp.LastLearningDate,
                AddingDate = uwlp == null ? DateTime.MinValue : uwlp.AddingDate,
                Translations = w.Translations.Where(t => t.UserTranslations.Any(ut => ut.UserId == userId))
                    .OrderBy(t => t.UserTranslations.First(ut => ut.UserId == userId).Position).Select(t => t.Value)
                    .ToList(),
                PictureIds = w.Pictures.Where(p => p.UserPictures.Any(up => up.UserId == userId))
                    .OrderBy(t => t.UserPictures.First(up => up.UserId == userId).Position).Select(p => p.Id)
                    .ToList(),
                Usages = w.Usages.Where(u => u.UserUsages.Any(uu => uu.UserId == userId))
                    .OrderBy(u => u.UserUsages.First(uu => uu.UserId == userId).Position).Select(u => u.Value)
                    .ToList(),
                IsAnyNewPictureAvailable = w.Pictures.Any() && w.Pictures.All(p => p.UserPictures.All(up => up.UserId != userId))
            };

        async Task<List<TranslationsWordRepresentation>> GetExerciseWordsAsync(WordLearningProgress? progress, int count)
        {
            var excludeWordIds = result.Select(w => w.WordId).ToList();

            var shuffledQuery = progress == WordLearningProgress.Two
                ? query.Where(x => x.LastLearningDate < DateTime.Now.Date)
                : query;

            shuffledQuery = shuffledQuery
                .OrderBy(sq => progress == WordLearningProgress.None ? sq.AddingDate : sq.LastLearningDate);

            return await shuffledQuery.Where(q =>
                    excludeWordIds.All(id => id != q.WordId) && (progress == null ||
                    q.WordLearningProgress == progress)).Take(count)
                .Select(q => new TranslationsWordRepresentation
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

        result.AddRange(await GetExerciseWordsAsync(WordLearningProgress.Three, 2));
        result.AddRange(await GetExerciseWordsAsync(WordLearningProgress.Two,
            GeneralConstants.WordTranslationsExerciseWordsCount - result.Count));

        if (result.Count < GeneralConstants.WordTranslationsExerciseWordsCount)
        {
            result.AddRange(await GetExerciseWordsAsync(WordLearningProgress.One,
                GeneralConstants.WordTranslationsExerciseWordsCount - result.Count));

            if (result.Count < GeneralConstants.WordTranslationsExerciseWordsCount)
            {
                result.AddRange(await GetExerciseWordsAsync(WordLearningProgress.None,
                    GeneralConstants.WordTranslationsExerciseWordsCount - result.Count));

                if (result.Count < GeneralConstants.WordTranslationsExerciseWordsCount)
                {
                    result.AddRange(await GetExerciseWordsAsync(WordLearningProgress.Three,
                        GeneralConstants.WordTranslationsExerciseWordsCount - result.Count));
                }
            }
        }

        return result.OrderByDescending(x => x.WordLearningProgress).ToList();
    }

    public async Task PutAsync(List<PutExerciseWordResult> exerciseResults)
    {
        var language =
            (await dbContext.Words.FirstOrDefaultAsync(w => w.Id == exerciseResults.First().WordId))?.Language ??
            Language.English;
        var now = DateOnly.FromDateTime(DateTime.Now);
        var userStatistic =
            await dbContext.UserStatistics.FirstOrDefaultAsync(us =>
                us.UserId == userId && us.Language == language && us.Date == now);

        if (userStatistic == null)
        {
            userStatistic = new UserStatistic
            {
                UserId = userId,
                Language = language,
                Percentage = default,
                Date = now
            };
            await dbContext.UserStatistics.AddAsync(userStatistic);
        }

        var wordIds = exerciseResults.Select(r => r.WordId).Distinct().ToList();
        var userWordLearningProgresses = await dbContext.UserWordLearningProgresses
            .Where(uwlp => uwlp.UserId == userId && wordIds.Contains(uwlp.WordId)).ToListAsync();
        foreach (var exerciseWordResult in exerciseResults)
        {
            var userWordLearningProgress = userWordLearningProgresses.FirstOrDefault(ut => ut.WordId == exerciseWordResult.WordId);
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
                UpdateUserStatistic(userStatistic, userWordLearningProgress.WordLearningProgress, exerciseWordResult.WithHelp);

            if (exerciseWordResult.IsCorrectAnswer &&
                userWordLearningProgress.WordLearningProgress != WordLearningProgress.Three)
                userWordLearningProgress.WordLearningProgress++;

            if (!exerciseWordResult.IsCorrectAnswer &&
                userWordLearningProgress.WordLearningProgress != WordLearningProgress.None)
                userWordLearningProgress.WordLearningProgress--;
        }
        await dbContext.SaveChangesAsync();
    }

    private void UpdateUserStatistic(UserStatistic userStatistic, WordLearningProgress wordLearningProgress, bool withHelp)
    {
        userStatistic.Percentage += wordLearningProgress switch
        {
            WordLearningProgress.None => 7,
            WordLearningProgress.One => 6,
            WordLearningProgress.Two => 5,
            WordLearningProgress.Three => 3,
            _ => throw new ArgumentOutOfRangeException(nameof(wordLearningProgress), wordLearningProgress, null)
        };

        if (withHelp)
        {
            userStatistic.Percentage -= 3;
        }
    }
}
