using Api.Enums;

namespace Api.Representations;

public class MistakePatternRepresentation
{
    public int Id { get; set; }
    public string Category { get; set; }
    public string Rule { get; set; }
    public MistakeProgress Progress { get; set; }
    public int OccurrencesCount { get; set; }
    public DateTime? LastOccurrenceDate { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? LastPracticeDate { get; set; }
    public bool IsPractisedToday { get; set; }
    public List<MistakeOccurrenceRepresentation> Examples { get; set; } = [];
}

public class MistakesExerciseRepresentation
{
    public List<MistakeTaskRepresentation> Tasks { get; set; } = [];
    public string Error { get; set; }
}

public class MistakeTaskRepresentation
{
    public int PatternId { get; set; }
    public string Category { get; set; }
    public string Rule { get; set; }
    public MistakeProgress Progress { get; set; }
    public string Sentence { get; set; }
    public string Fragment { get; set; }
    public string CorrectedSentence { get; set; }
    public string Explanation { get; set; }
    public MistakeOccurrenceRepresentation Example { get; set; }
}

public class MistakeAnswerRepresentation
{
    public bool IsCorrect { get; set; }
    public string CorrectedSentence { get; set; }
    public string Explanation { get; set; }
    public MistakeProgress Progress { get; set; }
    public bool IsCounted { get; set; }
    public int Points { get; set; }
    public string Error { get; set; }
}

public class MistakeOccurrenceRepresentation
{
    public string Fragment { get; set; }
    public string Correction { get; set; }
    public string Explanation { get; set; }
    public DateTime CreatedDate { get; set; }
}
