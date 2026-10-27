using Api.Ai;
using Api.Enums;

namespace Api.Interfaces.Services;

public interface ISentenceTranslationAiService
{
    bool IsConfigured { get; }

    Task<AiResult<AiSentenceTasks>> GenerateSentencesAsync(Language language, LanguageLevel level,
        TranslationLanguage sentenceLanguage, int count);

    Task<AiResult<AiSentenceAnswerCheck>> CheckAnswerAsync(Language language, string sentence, string answer,
        IReadOnlyList<string> knownRules);
}
