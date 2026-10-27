using Api.Enums;

namespace Api.Requests.ExerciseCompletions;

public class PostExerciseCompletionRequest
{
    public Language Language { get; set; }
    public ExerciseType Exercise { get; set; }
}
