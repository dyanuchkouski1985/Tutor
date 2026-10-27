using Api.Ai;
using Api.Enums;

namespace Api.Interfaces.Services;

public interface IArticlesAiService
{
    Task<AiResult<AiArticleTasks>> GenerateTasksAsync(LanguageLevel level, IReadOnlyList<string> knownRules);
}
