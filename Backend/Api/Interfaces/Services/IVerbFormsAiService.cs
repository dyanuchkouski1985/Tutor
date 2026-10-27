using Api.Ai;
using Api.Enums;

namespace Api.Interfaces.Services;

public interface IVerbFormsAiService
{
    Task<AiResult<AiVerbFormTasks>> GenerateTasksAsync(LanguageLevel level, IReadOnlyList<string> knownRules);
}
