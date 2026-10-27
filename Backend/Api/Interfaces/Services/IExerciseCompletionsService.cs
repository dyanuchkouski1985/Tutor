using Api.Enums;
using Api.Representations;

namespace Api.Interfaces.Services;

public interface IExerciseCompletionsService
{
    Task MarkCompletedAsync(Language language, ExerciseType exercise);

    Task<List<ExerciseCompletionSummaryRepresentation>> GetSummaryAsync(Language language, int months,
        bool isAllUsers);
}
