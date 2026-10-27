using Api.Enums;
using Api.Representations;
using Api.Requests.Guess;

namespace Api.Interfaces.Services;

public interface IGuessService
{
    Task<int> CountAvailableWordsAsync(Language language);

    Task<GuessExerciseRepresentation> GetExerciseAsync(Language language);

    Task<GuessAnswerRepresentation> AnswerAsync(AnswerGuessRequest request);
}
