using Api.Ai;
using Api.Enums;

namespace Api.Representations;

public class ConversationListItemRepresentation
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Context { get; set; }
    public Language Language { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime LastActivityDate { get; set; }
    public int MessagesCount { get; set; }
    public List<string> ParticipantNames { get; set; } = [];
}

public class ConversationRepresentation
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Context { get; set; }
    public bool AutoFormat { get; set; }
    public bool SendImmediately { get; set; }
    public bool UseLearningWords { get; set; }
    public Language Language { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime LastActivityDate { get; set; }
    public bool IsUserTurn { get; set; }
    public List<ConversationParticipantRepresentation> Participants { get; set; } = [];
    public List<ConversationMessageRepresentation> Messages { get; set; } = [];
}

public class ConversationParticipantRepresentation
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public bool IsUser { get; set; }
    public ParticipantGender Gender { get; set; }
    public ParticipantVoice Voice { get; set; }
}

public class ConversationMessageRepresentation
{
    public int Id { get; set; }
    public int ParticipantId { get; set; }
    public string ParticipantName { get; set; }
    public bool IsUser { get; set; }
    public string Text { get; set; }
    public DateTime CreatedDate { get; set; }
    public MessageValidationStatus ValidationStatus { get; set; }
    public string ValidationSummary { get; set; }
    public List<AiValidationError> ValidationErrors { get; set; } = [];
    public int Points { get; set; }
}

public class CreateConversationRepresentation
{
    public bool IsCreated { get; set; }
    public string Reason { get; set; }
    public List<ConversationSetupIssueRepresentation> Issues { get; set; } = [];
    public ConversationRepresentation Conversation { get; set; }
}

public class UpdateConversationRepresentation
{
    public bool IsUpdated { get; set; }
    public string Reason { get; set; }
    public List<ConversationSetupIssueRepresentation> Issues { get; set; } = [];
    public ConversationRepresentation Conversation { get; set; }
}

public class ConversationSetupIssueRepresentation
{
    public string ParticipantName { get; set; }
    public string Problem { get; set; }
    public string Suggestion { get; set; }
}

public class GenerateConversationRepresentation
{
    public string Context { get; set; }
    public string LearnerDescription { get; set; }
    public List<GeneratedConversationParticipantRepresentation> Participants { get; set; } = [];
    public string Error { get; set; }
}

public class GeneratedConversationParticipantRepresentation
{
    public string Name { get; set; }
    public string Description { get; set; }
    public ParticipantGender Gender { get; set; }
}

public class FormatConversationMessageRepresentation
{
    public string Text { get; set; }
    public string Error { get; set; }
}

public class ConversationTurnRepresentation
{
    public bool IsUserTurn { get; set; }
    public ConversationMessageRepresentation Message { get; set; }
    public ConversationParticipantRepresentation NewParticipant { get; set; }
    public string Error { get; set; }
}
