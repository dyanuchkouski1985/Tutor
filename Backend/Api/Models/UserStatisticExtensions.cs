using Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace Api.Models;

public static class UserStatisticExtensions
{
    public static DateOnly Today() => DateOnly.FromDateTime(DateTime.Now);

    public static async Task<UserStatistic> GetOrCreateTodayStatisticAsync(this TutorContext dbContext,
        Guid userId, Language language)
    {
        var now = Today();

        var userStatistic = dbContext.UserStatistics.Local.FirstOrDefault(us =>
                                us.UserId == userId && us.Language == language && us.Date == now)
                            ?? await dbContext.UserStatistics.FirstOrDefaultAsync(us =>
                                us.UserId == userId && us.Language == language && us.Date == now);

        if (userStatistic != null)
            return userStatistic;

        userStatistic = new UserStatistic
        {
            UserId = userId,
            Language = language,
            Percentage = default,
            Date = now
        };

        await dbContext.UserStatistics.AddAsync(userStatistic);

        return userStatistic;
    }
}
