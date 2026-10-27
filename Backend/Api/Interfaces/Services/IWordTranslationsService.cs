using Api.Enums;
using Api.Representations;
using Api.Representations.Common;
using Api.Requests.WordTranslations;

namespace Api.Interfaces.Services;

public interface IWordTranslationsService
{
    Task<WordTranslationsRepresentation> GetAsync(GetWordTranslationsRequest request);
    Task<WordTranslationsRepresentation> PutAsync(PutWordTranslationsRequest request, IFormFileCollection files, IFormFile pronunciation);
    Task<bool> DeleteAsync(int wordId);
    Task<Page<WordTranslationsRepresentation>> SearchAsync(SearchWordTranslationsRequest request);
    Task<Dictionary<char, SuggestionRepresentation[]>> SuggestionsAsync(Language language);
    Task<WordSuggestionsRepresentation> SuggestTranslationsAsync(SuggestWordItemsRequest request);
    Task<WordSuggestionsRepresentation> SuggestUsagesAsync(SuggestWordItemsRequest request);
    Task AddPronunciationsAsync(Language language);
}