using Api.Representations;

namespace Api.Interfaces.Services;

public interface IWordPronunciationService
{
    Task<WordPronunciationRepresentation> GetWordPronunciationAsync(int wordId);
}