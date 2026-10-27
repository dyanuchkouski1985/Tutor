using Api.Enums;

namespace Api.Representations;

public class GuessExerciseRepresentation
{
    public List<GuessTaskRepresentation> Tasks { get; set; } = [];
    public string Error { get; set; }
}

public class GuessTaskRepresentation
{
    public int WordId { get; set; }
    public string Description { get; set; }
    public string Example { get; set; }
    public List<string> Letters { get; set; } = [];
}

public class GuessAnswerRepresentation
{
    public bool IsCorrect { get; set; }
    public string Word { get; set; }
    public List<string> Translations { get; set; } = [];
    public List<string> Usages { get; set; } = [];
    public WordLearningProgress WordLearningProgress { get; set; }
    public int Points { get; set; }
    public string Error { get; set; }
}
