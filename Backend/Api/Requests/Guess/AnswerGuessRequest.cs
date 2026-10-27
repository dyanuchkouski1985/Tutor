using Api.Enums;

namespace Api.Requests.Guess;

public class AnswerGuessRequest
{
    public Language Language { get; set; }
    public int WordId { get; set; }
    public string Answer { get; set; }
    public int RevealedHintsCount { get; set; }
}
