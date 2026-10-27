using Api.Enums;

namespace Api.Models;

public class UserExerciseCompletion
{
    public int Id { get; init; }
    public Guid UserId { get; init; }
    public Language Language { get; init; }
    public ExerciseType Exercise { get; init; }
    public DateOnly Date { get; init; }
}
