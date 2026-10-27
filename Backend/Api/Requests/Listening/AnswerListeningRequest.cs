using Api.Enums;

namespace Api.Requests.Listening;

public class AnswerListeningRequest
{
    public Language Language { get; set; }
    public string Key { get; set; }
    public int QuestionIndex { get; set; }
    public int Answer { get; set; }
    public bool IsTextShown { get; set; }
    public bool IsReplayed { get; set; }
}
