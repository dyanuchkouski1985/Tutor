using Api.Enums;

namespace Api.Representations;

public class ListeningExerciseRepresentation
{
    public string Situation { get; set; }
    public List<ListeningParticipantRepresentation> Participants { get; set; } = [];
    public List<ListeningLineRepresentation> Lines { get; set; } = [];
    public List<ListeningQuestionRepresentation> Questions { get; set; } = [];
    public string Key { get; set; }
    public string Error { get; set; }
}

public class ListeningParticipantRepresentation
{
    public int Id { get; set; }
    public string Name { get; set; }
    public ParticipantVoice Voice { get; set; }
}

public class ListeningLineRepresentation
{
    public int ParticipantId { get; set; }
    public string Text { get; set; }
    public string Translation { get; set; }
}

public class ListeningQuestionRepresentation
{
    public string Text { get; set; }
    public List<string> Options { get; set; } = [];
}

public class ListeningAnswerRepresentation
{
    public bool IsCorrect { get; set; }
    public int CorrectOption { get; set; }
    public int Points { get; set; }
    public string Error { get; set; }
}
