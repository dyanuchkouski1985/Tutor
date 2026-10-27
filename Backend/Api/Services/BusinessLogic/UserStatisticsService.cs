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
    ISecurityContext securityContext,
    ITranslationsWordExerciseService translationsWordExerciseService,
    ICrosswordExerciseService crosswordExerciseService,
    IRepeatPausedWordsExerciseService repeatPausedWordsExerciseService,
    IGuessService guessService,
    IExplainService explainService,
    ITomorrowWordsService tomorrowWordsService)
    : IUserStatisticsService
{
    private const int periodInDays = 8;
    private TutorContext dbContext { get; } = dbContext;
    private Guid userId { get; } = Guid.Parse(securityContext.GetCurrentUserId());
    private string email { get; } = securityContext.GetCurrentUserEmail();
    private ITranslationsWordExerciseService translationsWordExerciseService { get; } = translationsWordExerciseService;
    private ICrosswordExerciseService crosswordExerciseService { get; } = crosswordExerciseService;
    private IRepeatPausedWordsExerciseService repeatPausedWordsExerciseService { get; } =
        repeatPausedWordsExerciseService;
    private IGuessService guessService { get; } = guessService;
    private IExplainService explainService { get; } = explainService;
    private ITomorrowWordsService tomorrowWordsService { get; } = tomorrowWordsService;

    public async Task<UserStatisticsRepresentation> GetAsync(GetUserStatisticsRequest request)
    {
        var totalNumberOfWords = await dbContext.UserWordLearningProgresses.Where(p =>
                p.UserId == userId && p.Word.Language == request.Language)
            .CountAsync();

        var now = DateOnly.FromDateTime(DateTime.Now);
        var availableRepeatPausedWordsCount =
            await repeatPausedWordsExerciseService.CountAvailableWordsAsync(request.Language);
        var availableTranslationsWordsCount =
            await translationsWordExerciseService.CountAvailableWordsAsync(request.Language);
        var availableCrosswordWordsCount = await crosswordExerciseService.CountAvailableWordsAsync(request.Language);
        var availableGuessWordsCount = await guessService.CountAvailableWordsAsync(request.Language);
        var availableExplainWordsCount = await explainService.CountAvailableWordsAsync(request.Language);
        var availableTomorrowWordsCount = await tomorrowWordsService.CountAvailableWordsAsync(request.Language);
        var dailyStatistic = await dbContext.UserStatistics.FirstOrDefaultAsync(us =>
            us.UserId == userId && us.Language == request.Language && us.Date == now);

        UserStatisticsRepresentation result = new()
        {
            Email = email,
            DailyPercentage = dailyStatistic?.Percentage ?? default,
            ConversationPercentage = dailyStatistic?.ConversationPercentage ?? default,
            ConversationMaxDailyPoints = GeneralConstants.ConversationMaxDailyPoints,
            CountabilityPercentage = dailyStatistic?.CountabilityPercentage ?? default,
            CountabilityMaxDailyPoints = GeneralConstants.CountabilityMaxDailyPoints,
            VerbFormsPercentage = dailyStatistic?.VerbFormsPercentage ?? default,
            VerbFormsMaxDailyPoints = GeneralConstants.VerbFormsMaxDailyPoints,
            ArticlesPercentage = dailyStatistic?.ArticlesPercentage ?? default,
            ArticlesMaxDailyPoints = GeneralConstants.ArticlesMaxDailyPoints,
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
                                                   GeneralConstants.RepeatWordsExerciseWordsCount,
            IsAvailableTranslationsWordExercise = availableTranslationsWordsCount >=
                                                  GeneralConstants.WordTranslationsExerciseWordsCount,
            IsAvailableCrosswordExercise = availableCrosswordWordsCount >= GeneralConstants.CrosswordMinWordsCount,
            IsAvailableGuessExercise = availableGuessWordsCount >= GeneralConstants.GuessExerciseWordsCount,
            IsAvailableExplainExercise = availableExplainWordsCount >= GeneralConstants.ExplainExerciseWordsCount,
            IsAvailableListeningExercise = ListeningService.IsSupported(request.Language),
            IsAvailableCountabilityExercise = CountabilityService.IsSupported(request.Language),
            IsAvailableVerbFormsExercise = VerbFormsService.IsSupported(request.Language),
            IsAvailableArticlesExercise = ArticlesService.IsSupported(request.Language),
            IsAvailableTomorrowWords = (dailyStatistic?.Percentage ?? 0) >= GeneralConstants.DailyGoalPoints
                                       && availableTomorrowWordsCount > 0
        };

        result.TotalNumberOfWordsWithProgress0 = result.TotalNumberOfWords -
                                                 result.TotalNumberOfCompletedWords -
                                                 result.TotalNumberOfWordsWithProgress3 -
                                                 result.TotalNumberOfWordsWithProgress2 -
                                                 result.TotalNumberOfWordsWithProgress1 -
                                                 result.TotalNumberOfPausedWords;

        return result;
    }

    public async Task<UserStatisticsCalendarRepresentation> GetCalendarAsync(
        GetUserStatisticsCalendarRequest request)
    {
        var to = DateOnly.FromDateTime(DateTime.Now);
        var from = request.Months <= 0
            ? await dbContext.UserStatistics
                .Where(us => us.UserId == userId && us.Language == request.Language && us.Date <= to)
                .MinAsync(us => (DateOnly?)us.Date) ?? to
            : to.AddMonths(-Math.Min(request.Months, GeneralConstants.CalendarMaxMonths)).AddDays(1);

        var days = await dbContext.UserStatistics
            .Where(us =>
                us.UserId == userId && us.Language == request.Language &&
                us.Date >= from && us.Date <= to)
            .OrderBy(us => us.Date)
            .Select(us => new UserStatisticsCalendarDayRepresentation
            {
                Date = us.Date,
                Percentage = us.Percentage,
                ConversationPercentage = us.ConversationPercentage
            })
            .ToListAsync();

        return new UserStatisticsCalendarRepresentation
        {
            From = from,
            To = to,
            DailyGoalPoints = GeneralConstants.DailyGoalPoints,
            ConversationMaxDailyPoints = GeneralConstants.ConversationMaxDailyPoints,
            Days = days
        };
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
}
