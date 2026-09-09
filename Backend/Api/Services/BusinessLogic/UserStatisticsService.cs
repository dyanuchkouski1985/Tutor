using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Api.Requests.UserStatistics;
using Microsoft.EntityFrameworkCore;

namespace Api.Services.BusinessLogic;

public class UserStatisticsService(
    TutorContext dbContext,
    ISecurityContext securityContext)
    : IUserStatisticsService
{
    private const int periodInDays = 8;
    private TutorContext dbContext { get; } = dbContext;
    private Guid userId { get; } = Guid.Parse(securityContext.GetCurrentUserId());
    private string email { get; } = securityContext.GetCurrentUserEmail();

    public async Task<UserStatisticsRepresentation> GetAsync(GetUserStatisticsRequest request)
    {
        var totalNumberOfWords = await dbContext.UserWordLearningProgresses.Where(p =>
                p.UserId == userId && p.Word.Language == request.Language)
            .CountAsync();

        var now = DateOnly.FromDateTime(DateTime.Now);
        var availableRepeatPausedWordsCount = await GetAvailableRepeatPausedWordsCountAsync(request.Language);

        UserStatisticsRepresentation result = new()
        {
            Email = email,
            DailyPercentage =
                (await dbContext.UserStatistics.FirstOrDefaultAsync(us =>
                    us.UserId == userId && us.Language == request.Language &&
                    us.Date == now))?.Percentage ?? default,
            TotalNumberOfWords = totalNumberOfWords,
            TotalNumberOfCompletedWords = 
                await GetTotalNumberOfWordsWithProgressAsync(WordLearningProgress.Completed, request.Language),
            TotalNumberOfPausedWords =
                await GetTotalNumberOfWordsWithProgressAsync(WordLearningProgress.Paused, request.Language),
            TotalNumberOfWordsWithProgress3 =
                await GetTotalNumberOfWordsWithProgressAsync(WordLearningProgress.Three, request.Language),
            TotalNumberOfWordsWithProgress2 =
                await GetTotalNumberOfWordsWithProgressAsync(WordLearningProgress.Two, request.Language),
            TotalNumberOfWordsWithProgress1 =
                await GetTotalNumberOfWordsWithProgressAsync(WordLearningProgress.One, request.Language),
            LastDaysPercentages = await GetLastDaysPercentagesAsync(request.Language),
            AvailableRepeatPausedWordsCount = availableRepeatPausedWordsCount,
            IsAvailableRepeatPausedWordsExercise = availableRepeatPausedWordsCount >=
                                                   GeneralConstants.RepeatWordsExerciseWordsCount
        };

        result.TotalNumberOfWordsWithProgress0 = result.TotalNumberOfWords -
                                                 result.TotalNumberOfCompletedWords -
                                                 result.TotalNumberOfWordsWithProgress3 -
                                                 result.TotalNumberOfWordsWithProgress2 -
                                                 result.TotalNumberOfWordsWithProgress1 -
                                                 result.TotalNumberOfPausedWords;

        return result;
    }

    private Task<int> GetTotalNumberOfWordsWithProgressAsync(WordLearningProgress wordLearningProgress,
        Language language)
    {
        return dbContext.UserWordLearningProgresses.Where(uwlp =>
                uwlp.UserId == userId && uwlp.Word.Language == language &&
                uwlp.WordLearningProgress == wordLearningProgress)
            .CountAsync();
    }

    private async Task<List<int>> GetLastDaysPercentagesAsync(Language language)
    {
        var firstDate = DateOnly.FromDateTime(DateTime.Now.AddDays(-periodInDays + 1));

        var statistics = await dbContext.UserStatistics
            .Where(us =>
                us.UserId == userId && us.Language == language &&
                us.Date >= firstDate)
            .OrderByDescending(us => us.Date).Take(periodInDays).OrderBy(us => us.Date).ToListAsync();

        for (var i = 0; i < periodInDays; i++)
        {
            var date = DateOnly.FromDateTime(DateTime.Now.AddDays(-i));
            if (statistics.All(s => s.Date != date))
                statistics.Add(new UserStatistic
                {
                    Date = date,
                    Percentage = 0
                });
        }

        return statistics.OrderBy(us => us.Date).Select(us => us.Percentage).ToList();
    }

    private Task<int> GetAvailableRepeatPausedWordsCountAsync(Language language)
    {
        var query =
            from w in dbContext.Words
                .Where(w => w.Language == language
                            && w.Translations.Any(t =>
                                t.UserTranslations.Any(ut => ut.UserId == userId)))
            from uwlp in dbContext.UserWordLearningProgresses
                .Where(uwlp =>
                    uwlp.WordId == w.Id && uwlp.UserId == userId &&
                    (uwlp.WordLearningProgress == WordLearningProgress.Paused &&
                     uwlp.LastLearningDate <
                     DateTime.Now.AddDays(-GeneralConstants.RepeatWordsLearnedGreaterThanDays) ||
                     uwlp.WordLearningProgress == WordLearningProgress.Completed &&
                     uwlp.LastLearningDate <
                     DateTime.Now.AddDays(-GeneralConstants.CompletedWordsLearnedGreaterThanDays)))
                .DefaultIfEmpty()
            where uwlp.WordLearningProgress == WordLearningProgress.Paused || uwlp.WordLearningProgress == WordLearningProgress.Completed
            select new
            {
                w.Id
            };

        return query.CountAsync();
    }
}