using Api.Ai;
using Api.Enums;

namespace Api.Interfaces.Services;

public interface IConversationAiService
{
    bool IsConfigured { get; }

    Task<AiResult<AiConversationSetup>> ValidateSetupAsync(Language language, string context,
        IReadOnlyList<AiParticipant> participants);

    Task<AiResult<AiGeneratedConversation>> GenerateSetupAsync(Language language, LanguageLevel level,
        string learnerName, IReadOnlyList<string> avoidContexts);

    Task<AiResult<AiConversationTurn>> GetNextTurnAsync(Language language, LanguageLevel level,
        string context, IReadOnlyList<AiParticipant> participants, string summary,
        IReadOnlyList<AiMessage> history, string pinnedSpeakerName, IReadOnlyList<string> learningWords);

    Task<AiResult<AiFormattedMessage>> FormatMessageAsync(Language language, string context,
        IReadOnlyList<AiParticipant> participants, IReadOnlyList<AiMessage> history, string text,
        IReadOnlyList<string> alternatives);

    Task<AiResult<AiConversationSummary>> SummarizeAsync(Language language, string context,
        IReadOnlyList<AiParticipant> participants, string previousSummary, IReadOnlyList<AiMessage> messages);

    Task<AiResult<AiMessageValidation>> ValidateMessageAsync(Language language, LanguageLevel level,
        string context,
        string previousSpeakerName, string previousMessage, string userText,
        IReadOnlyList<string> knownRules);
}
