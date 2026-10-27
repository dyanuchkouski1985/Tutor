using Api.Enums;

namespace Api.Requests.ExerciseWords;

public class GetExerciseWordsRequest
{
    public Language Language { get; set; }
    public bool ExcludeLearnedToday { get; set; }
}