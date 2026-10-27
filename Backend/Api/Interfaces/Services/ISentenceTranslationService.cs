using Api.Enums;
using Api.Representations;
using Api.Requests.SentenceTranslation;

namespace Api.Interfaces.Services;

public interface ISentenceTranslationService
{
    Task<SentenceTranslationExerciseRepresentation> GetExerciseAsync(Language language,
        TranslationLanguage sentenceLanguage, int? count);

    Task<SentenceTranslationAnswerRepresentation> AnswerAsync(AnswerSentenceTranslationRequest request);
}
