using Api.Enums;
using Api.Representations;
using Api.Requests.Mistakes;

namespace Api.Interfaces.Services;

public interface IMistakesService
{
    Task<List<MistakePatternRepresentation>> GetAsync(Language language);

    Task<MistakePatternRepresentation> UpdateAsync(int patternId, UpdateMistakePatternRequest request);

    Task<bool> DeleteAsync(int patternId);

    Task<int> GetAvailableCountAsync(Language language);

    Task<MistakesExerciseRepresentation> GetExerciseAsync(Language language);

    Task<MistakeAnswerRepresentation> AnswerAsync(int patternId, AnswerMistakeTaskRequest request);
}
