using Api.Enums;

namespace Api.Models;

public class ConversationMessage
{
    public int Id { get; init; }
    public int ConversationId { get; init; }
    public Conversation Conversation { get; init; }
    public int ParticipantId { get; init; }
    public ConversationParticipant Participant { get; init; }
    public string Text { get; init; }
    public DateTime CreatedDate { get; init; }
    public MessageValidationStatus ValidationStatus { get; set; }
    public string ValidationSummary { get; set; }
    public string ValidationErrorsJson { get; set; }
    public int Points { get; set; }
}
