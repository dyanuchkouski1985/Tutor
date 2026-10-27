namespace Api.Representations;

public class GapChoiceExerciseRepresentation
{
    public List<GapChoiceTaskRepresentation> Tasks { get; set; } = [];
    public string Key { get; set; }
    public string Error { get; set; }
}

public class GapChoiceTaskRepresentation
{
    public string Noun { get; set; }
    public string Sentence { get; set; }
    public List<string> Options { get; set; } = [];
}

public class GapChoiceAnswerRepresentation
{
    public bool IsCorrect { get; set; }
    public int CorrectOption { get; set; }
    public string Explanation { get; set; }
    public int Points { get; set; }
    public string Error { get; set; }
}
