using Api.Enums;

namespace Api.Requests.SentenceTranslation;

public class AnswerSentenceTranslationRequest
{
    public Language Language { get; set; }
    public string Sentence { get; set; }
    public string Answer { get; set; }
    public int RevealedHintsCount { get; set; }
}
