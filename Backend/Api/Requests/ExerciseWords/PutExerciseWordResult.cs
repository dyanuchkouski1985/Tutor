namespace Api.Requests.ExerciseWords;

public class PutExerciseWordResult
{
    public int WordId { get; set; }
    public bool IsCorrectAnswer { get; set; }
    public bool WithHelp { get; set; }
}