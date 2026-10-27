using Api.Enums;
using Api.Representations;

namespace Api.Interfaces.Services;

public interface ITomorrowWordsService
{
    Task<List<TranslationsWordRepresentation>> GetAsync(Language language);
    Task<int> CountAvailableWordsAsync(Language language);
}
