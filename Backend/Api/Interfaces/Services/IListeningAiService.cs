using Api.Ai;
using Api.Enums;

namespace Api.Interfaces.Services;

public interface IListeningAiService
{
    Task<AiResult<AiListeningScene>> GenerateSceneAsync(Language language, LanguageLevel level,
        TranslationLanguage translationLanguage, IReadOnlyList<string> words);
}
