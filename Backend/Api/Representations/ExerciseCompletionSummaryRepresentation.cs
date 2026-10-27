using Api.Enums;

namespace Api.Representations;

public class ExerciseCompletionSummaryRepresentation
{
    public ExerciseType Exercise { get; set; }
    public int Days { get; set; }
    public int Percentage { get; set; }
}
