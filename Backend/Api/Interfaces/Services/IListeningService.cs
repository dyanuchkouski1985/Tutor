using Api.Enums;
using Api.Representations;
using Api.Requests.Listening;

namespace Api.Interfaces.Services;

public interface IListeningService
{
    Task<ListeningExerciseRepresentation> GetExerciseAsync(Language language, TranslationLanguage translationLanguage);

    Task<ListeningAnswerRepresentation> AnswerAsync(AnswerListeningRequest request);
}
