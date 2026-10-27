using Api.Enums;
using Api.Representations;
using Api.Requests.Explain;

namespace Api.Interfaces.Services;

public interface IExplainService
{
    Task<int> CountAvailableWordsAsync(Language language);

    Task<ExplainExerciseRepresentation> GetExerciseAsync(Language language);

    Task<ExplainGuessRepresentation> GuessAsync(GuessExplainRequest request);
}
