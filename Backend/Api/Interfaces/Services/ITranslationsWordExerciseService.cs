using Api.Enums;
using Api.Representations;
using Api.Requests.ExerciseWords;

namespace Api.Interfaces.Services;

public interface ITranslationsWordExerciseService
{
    Task<List<TranslationsWordRepresentation>> GetExerciseAsync(Language language);
    Task<int> CountAvailableWordsAsync(Language language);
    Task<List<TranslationsWordRepresentation>> GetAsync(GetExerciseWordsRequest request);
    Task<List<TranslationsWordRepresentation>> GetTomorrowAsync(Language language, int count);
    Task PutAsync(List<PutExerciseWordResult> exerciseResults);
}