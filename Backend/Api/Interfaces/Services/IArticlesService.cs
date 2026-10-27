using Api.Enums;
using Api.Representations;
using Api.Requests.GapChoice;

namespace Api.Interfaces.Services;

public interface IArticlesService
{
    Task<GapChoiceExerciseRepresentation> GetExerciseAsync(Language language);

    Task<GapChoiceAnswerRepresentation> AnswerAsync(AnswerGapChoiceRequest request);
}
