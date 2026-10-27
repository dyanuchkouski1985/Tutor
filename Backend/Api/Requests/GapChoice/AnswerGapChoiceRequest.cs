using Api.Enums;

namespace Api.Requests.GapChoice;

public class AnswerGapChoiceRequest
{
    public Language Language { get; set; }
    public string Key { get; set; }
    public int TaskIndex { get; set; }
    public int Answer { get; set; }
}
