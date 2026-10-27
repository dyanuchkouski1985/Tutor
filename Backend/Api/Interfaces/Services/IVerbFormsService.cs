using Api.Enums;
using Api.Representations;
using Api.Requests.VerbForms;

namespace Api.Interfaces.Services;

public interface IVerbFormsService
{
    Task<VerbFormsExerciseRepresentation> GetExerciseAsync(Language language);

    Task<VerbFormsAnswerRepresentation> AnswerAsync(AnswerVerbFormsRequest request);
}
