using Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace Api.Models;

public static class UserExerciseCompletionExtensions
{
    public static async Task MarkExerciseCompletedAsync(this TutorContext dbContext, Guid userId,
        Language language, ExerciseType exercise)
    {
        var today = UserStatisticExtensions.Today();

        var isMarked = dbContext.UserExerciseCompletions.Local.Any(completion =>
                           completion.UserId == userId && completion.Language == language
                                                       && completion.Date == today
                                                       && completion.Exercise == exercise)
                       || await dbContext.UserExerciseCompletions.AnyAsync(completion =>
                           completion.UserId == userId && completion.Language == language
                                                       && completion.Date == today
                                                       && completion.Exercise == exercise);

        if (isMarked)
            return;

        await dbContext.UserExerciseCompletions.AddAsync(new UserExerciseCompletion
        {
            UserId = userId,
            Language = language,
            Exercise = exercise,
            Date = today
        });
    }
}
