using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Api.Services.BusinessLogic;

public class ExerciseCompletionsService(
    TutorContext dbContext,
    ISecurityContext securityContext)
    : IExerciseCompletionsService
{
    private static readonly ExerciseType[] englishOnlyExercises =
    [
        ExerciseType.Listening,
        ExerciseType.Countability,
        ExerciseType.VerbForms,
        ExerciseType.Articles
    ];

    private TutorContext DbContext { get; } = dbContext;
    private Guid UserId { get; } = Guid.Parse(securityContext.GetCurrentUserId());

    public async Task MarkCompletedAsync(Language language, ExerciseType exercise)
    {
        await DbContext.MarkExerciseCompletedAsync(UserId, language, exercise);

        try
        {
            await DbContext.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
        }
    }

    public async Task<List<ExerciseCompletionSummaryRepresentation>> GetSummaryAsync(Language language, int months,
        bool isAllUsers)
    {
        var query = DbContext.UserExerciseCompletions
            .AsNoTracking()
            .Where(completion => completion.Language == language);

        if (!isAllUsers)
            query = query.Where(completion => completion.UserId == UserId);

        if (months > 0)
        {
            var from = UserStatisticExtensions.Today()
                .AddMonths(-Math.Min(months, GeneralConstants.CalendarMaxMonths))
                .AddDays(1);

            query = query.Where(completion => completion.Date >= from);
        }

        var days = await query
            .GroupBy(completion => completion.Exercise)
            .Select(group => new { Exercise = group.Key, Days = group.Count() })
            .ToDictionaryAsync(item => item.Exercise, item => item.Days);

        var totalDays = days.Values.Sum();

        return Enum.GetValues<ExerciseType>()
            .Where(exercise => language == Language.English || !englishOnlyExercises.Contains(exercise))
            .Select(exercise => new ExerciseCompletionSummaryRepresentation
            {
                Exercise = exercise,
                Days = days.GetValueOrDefault(exercise),
                Percentage = totalDays == 0
                    ? 0
                    : (int)Math.Round(100.0 * days.GetValueOrDefault(exercise) / totalDays)
            })
            .OrderByDescending(summary => summary.Days)
            .ThenBy(summary => summary.Exercise)
            .ToList();
    }
}
