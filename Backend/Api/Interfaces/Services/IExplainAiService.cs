using Api.Ai;
using Api.Enums;

namespace Api.Interfaces.Services;

public interface IExplainAiService
{
    bool IsConfigured { get; }

    Task<AiResult<AiExplainValidation>> ValidateExplanationAsync(Language language, string word,
        IReadOnlyList<string> translations, string explanation);

    Task<AiResult<AiExplainGuess>> GuessWordAsync(Language language, IReadOnlyList<AiExplainAttempt> attempts,
        string explanation);
}
