using Api.Representations;
using Api.Representations.Common;
using Api.Requests.Conversations;

namespace Api.Interfaces.Services;

public interface IConversationService
{
    Task<Page<ConversationListItemRepresentation>> SearchAsync(SearchConversationsRequest request);

    Task<ConversationRepresentation> GetAsync(int conversationId);

    Task<CreateConversationRepresentation> CreateAsync(CreateConversationRequest request);

    Task<GenerateConversationRepresentation> GenerateAsync(GenerateConversationRequest request);

    Task<UpdateConversationRepresentation> UpdateAsync(int conversationId,
        UpdateConversationRequest request);

    Task<ConversationTurnRepresentation> TurnAsync(int conversationId);

    Task<ConversationTurnRepresentation> PostMessageAsync(int conversationId,
        SubmitConversationMessageRequest request);

    Task<FormatConversationMessageRepresentation> FormatMessageAsync(int conversationId,
        FormatConversationMessageRequest request);

    Task<bool> DeleteAsync(int conversationId);
}
