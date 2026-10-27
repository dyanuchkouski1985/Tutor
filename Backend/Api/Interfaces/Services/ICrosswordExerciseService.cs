using Api.Enums;
using Api.Representations;
using Api.Requests.ExerciseWords;

namespace Api.Interfaces.Services;

public interface ICrosswordExerciseService
{
    Task<CrosswordExerciseRepresentation> GetAsync(GetCrosswordExerciseRequest request);
    Task<int> CountAvailableWordsAsync(Language language);
}