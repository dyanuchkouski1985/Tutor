namespace Api.Representations;

public class VerbFormsExerciseRepresentation
{
    public List<VerbFormsTaskRepresentation> Tasks { get; set; } = [];
    public string Key { get; set; }
    public string Error { get; set; }
}

public class VerbFormsTaskRepresentation
{
    public string Verb { get; set; }
    public string Sentence { get; set; }
}

public class VerbFormsAnswerRepresentation
{
    public bool IsCorrect { get; set; }
    public string CorrectAnswer { get; set; }
    public List<string> Forms { get; set; } = [];
    public string Explanation { get; set; }
    public int Points { get; set; }
    public string Error { get; set; }
}
