using Api.Ai;
using Api.Enums;

namespace Api.Interfaces.Services;

public interface ICountabilityAiService
{
    Task<AiResult<AiCountabilityTasks>> GenerateTasksAsync(LanguageLevel level, IReadOnlyList<string> knownRules);
}
