using Api.Ai;
using Api.Enums;

namespace Api.Interfaces.Services;

public interface IGuessAiService
{
    bool IsConfigured { get; }

    Task<AiResult<AiGuessDescriptions>> DescribeWordsAsync(Language language, LanguageLevel level,
        IReadOnlyList<AiGuessWord> words);
}
