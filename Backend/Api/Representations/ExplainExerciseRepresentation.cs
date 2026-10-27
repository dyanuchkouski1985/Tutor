using Api.Enums;

namespace Api.Representations;

public class ExplainExerciseRepresentation
{
    public List<ExplainTaskRepresentation> Tasks { get; set; } = [];
}

public class ExplainTaskRepresentation
{
    public int WordId { get; set; }
    public string Word { get; set; }
    public List<string> Translations { get; set; } = [];
    public List<string> Usages { get; set; } = [];
    public string ExampleExplanation { get; set; }
}

public class ExplainGuessRepresentation
{
    public bool IsValid { get; set; }
    public string Reason { get; set; }
    public string Guess { get; set; }
    public bool IsCorrect { get; set; }
    public bool IsFinished { get; set; }
    public int Points { get; set; }
    public WordLearningProgress WordLearningProgress { get; set; }
    public string Error { get; set; }
}
