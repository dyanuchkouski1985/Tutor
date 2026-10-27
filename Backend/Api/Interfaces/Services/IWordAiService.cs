using Api.Ai;
using Api.Enums;

namespace Api.Interfaces.Services;

public interface IWordAiService
{
    bool IsConfigured { get; }

    Task<AiResult<AiWordSuggestions>> SuggestTranslationsAsync(Language language,
        TranslationLanguage translationLanguage, string value, IReadOnlyList<string> existing);

    Task<AiResult<AiWordSuggestions>> SuggestUsagesAsync(Language language, LanguageLevel level,
        string value, IReadOnlyList<string> existing);
}
