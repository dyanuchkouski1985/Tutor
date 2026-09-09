using Api.Representations;
using Api.Requests.ExerciseWords;

namespace Api.Interfaces.Services;

public interface IRepeatPausedWordsExerciseService
{
    Task<List<TranslationsWordRepresentation>> GetAsync(GetExerciseWordsRequest request);
    Task PutAsync(List<PutExerciseWordResult> exerciseResults);
}