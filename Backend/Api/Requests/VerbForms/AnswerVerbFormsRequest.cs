using Api.Enums;

namespace Api.Requests.VerbForms;

public class AnswerVerbFormsRequest
{
    public Language Language { get; set; }
    public string Key { get; set; }
    public int TaskIndex { get; set; }
    public string Answer { get; set; }
}
