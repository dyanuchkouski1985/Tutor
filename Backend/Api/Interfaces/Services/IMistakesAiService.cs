using Api.Ai;
using Api.Enums;

namespace Api.Interfaces.Services;

public interface IMistakesAiService
{
    bool IsConfigured { get; }

    Task<AiResult<AiMistakeTasks>> GenerateTasksAsync(Language language, LanguageLevel level,
        IReadOnlyList<AiMistakeRule> rules);

    Task<AiResult<AiMistakeAnswerCheck>> CheckAnswerAsync(Language language, string rule, string sentence,
        string answer);
}
