namespace Api.Requests.Mistakes;

public class AnswerMistakeTaskRequest
{
    public string Sentence { get; set; }
    public string Answer { get; set; }
    public string CorrectedSentence { get; set; }
    public string Explanation { get; set; }
    public bool UsedHint { get; set; }
    public bool IsGivenUp { get; set; }
}
