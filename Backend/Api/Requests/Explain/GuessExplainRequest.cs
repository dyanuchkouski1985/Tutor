using Api.Enums;

namespace Api.Requests.Explain;

public class GuessExplainRequest
{
    public Language Language { get; set; }
    public int WordId { get; set; }
    public string Explanation { get; set; }
    public List<ExplainAttemptRequest> Attempts { get; set; } = [];
    public bool IsHintShown { get; set; }
    public bool IsGivenUp { get; set; }
}

public class ExplainAttemptRequest
{
    public string Explanation { get; set; }
    public string Guess { get; set; }
}
