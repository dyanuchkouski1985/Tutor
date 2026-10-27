namespace Api.Representations;

public class SentenceTranslationExerciseRepresentation
{
    public List<SentenceTranslationTaskRepresentation> Tasks { get; set; } = [];
    public string Error { get; set; }
}

public class SentenceTranslationTaskRepresentation
{
    public string Sentence { get; set; }
    public string Translation { get; set; }
    public List<SentenceTranslationHintRepresentation> Hints { get; set; } = [];
}

public class SentenceTranslationHintRepresentation
{
    public string Fragment { get; set; }
    public string Translation { get; set; }
}

public class SentenceTranslationAnswerRepresentation
{
    public bool IsCorrect { get; set; }
    public string NaturalTranslation { get; set; }
    public string Explanation { get; set; }
    public int Points { get; set; }
    public string Error { get; set; }
}
