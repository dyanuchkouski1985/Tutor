using System.Text.Json;
using Api.Ai;
using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Api.Representations.Common;
using Api.Requests.Conversations;
using Api.Speech;
using Microsoft.EntityFrameworkCore;

namespace Api.Services.BusinessLogic;

public class ConversationService(
    TutorContext dbContext,
    ISecurityContext securityContext,
    IConversationAiService aiService,
    ILanguageSettingsService languageSettingsService)
    : IConversationService
{
    private static readonly JsonSerializerOptions jsonSerializerOptions =
        new() { PropertyNameCaseInsensitive = true };

    private TutorContext DbContext { get; } = dbContext;
    private Guid UserId { get; } = Guid.Parse(securityContext.GetCurrentUserId());
    private IConversationAiService AiService { get; } = aiService;
    private ILanguageSettingsService LanguageSettingsService { get; } = languageSettingsService;

    public async Task<Page<ConversationListItemRepresentation>> SearchAsync(
        SearchConversationsRequest request)
    {
        Page<ConversationListItemRepresentation> result = new()
        {
            From = request.From,
            Count = request.Count <= 0 ? GeneralConstants.ConversationsDefaultPageSize : request.Count
        };

        var query = DbContext.Conversations
            .AsNoTracking()
            .Where(conversation => conversation.UserId == UserId
                                   && conversation.Language == request.Language
                                   && (string.IsNullOrWhiteSpace(request.Value)
                                       || EF.Functions.Like(conversation.Title, "%" + request.Value + "%")
                                       || EF.Functions.Like(conversation.Context, "%" + request.Value + "%")));

        result.ItemsCount = await query.CountAsync();

        result.Items = await SortConversationsQuery(query, request)
            .Skip(result.From)
            .Take(result.Count)
            .Select(conversation => new ConversationListItemRepresentation
            {
                Id = conversation.Id,
                Title = conversation.Title,
                Context = conversation.Context,
                Language = conversation.Language,
                CreatedDate = conversation.CreatedDate,
                LastActivityDate = conversation.LastActivityDate,
                MessagesCount = conversation.Messages.Count,
                ParticipantNames = conversation.Participants
                    .OrderBy(participant => participant.Id)
                    .Select(participant => participant.Name)
                    .ToList()
            })
            .ToListAsync();

        return result;
    }

    public async Task<ConversationRepresentation> GetAsync(int conversationId)
    {
        var conversation = await DbContext.Conversations
            .AsNoTracking()
            .Include(entity => entity.Participants)
            .Include(entity => entity.Messages)
            .ThenInclude(message => message.Participant)
            .FirstOrDefaultAsync(entity => entity.Id == conversationId && entity.UserId == UserId);

        return conversation == null ? null : MapConversation(conversation);
    }

    public async Task<CreateConversationRepresentation> CreateAsync(CreateConversationRequest request)
    {
        var problem = request.Participants?.Count > GeneralConstants.ConversationMaxParticipantsCount
            ? $"A conversation can have at most {GeneralConstants.ConversationMaxParticipantsCount} participants including you."
            : GetStructuralProblem(request.Context, request.Participants);

        if (problem != null)
            return new CreateConversationRepresentation { IsCreated = false, Reason = problem };

        var conversationsCount = await DbContext.Conversations
            .CountAsync(conversation => conversation.UserId == UserId
                                        && conversation.Language == request.Language);

        if (conversationsCount >= GeneralConstants.ConversationMaxCountPerLanguage)
            return new CreateConversationRepresentation
            {
                IsCreated = false,
                Reason = $"You already have {GeneralConstants.ConversationMaxCountPerLanguage} " +
                         "conversations. Delete one to create another."
            };

        var context = request.Context.Trim();

        var aiParticipants = request.Participants
            .Select(participant => new AiParticipant(participant.Name.Trim(),
                participant.Description?.Trim(), participant.IsUser))
            .ToList();

        var setup = await AiService.ValidateSetupAsync(request.Language, context, aiParticipants);

        if (!setup.IsSuccess)
            return new CreateConversationRepresentation { IsCreated = false, Reason = setup.ErrorMessage };

        if (!setup.Value.IsSufficient)
            return new CreateConversationRepresentation
            {
                IsCreated = false,
                Reason = BuildSetupReason(setup.Value),
                Issues = BuildSetupIssues(setup.Value, aiParticipants)
            };

        var now = DateTime.UtcNow;

        var conversation = new Conversation
        {
            UserId = UserId,
            Language = request.Language,
            Context = context,
            AutoFormat = request.AutoFormat,
            UseLearningWords = request.UseLearningWords,
            SendImmediately = request.SendImmediately,
            Title = BuildTitle(setup.Value.Title, context),
            CreatedDate = now,
            LastActivityDate = now
        };

        var voices = ResolveVoices(request.Participants, setup.Value.Voices);

        foreach (var participant in request.Participants)
            conversation.Participants.Add(new ConversationParticipant
            {
                Name = participant.Name.Trim(),
                Description = participant.Description?.Trim(),
                IsUser = participant.IsUser,
                Gender = participant.Gender,
                Voice = voices[participant.Name.Trim()]
            });

        await DbContext.Conversations.AddAsync(conversation);
        await DbContext.SaveChangesAsync();

        conversation.NextSpeaker = conversation.Participants
            .FirstOrDefault(participant =>
                string.Equals(participant.Name, setup.Value.FirstSpeaker, StringComparison.OrdinalIgnoreCase));

        if (conversation.NextSpeaker != null)
            await DbContext.SaveChangesAsync();

        return new CreateConversationRepresentation
        {
            IsCreated = true,
            Conversation = MapConversation(conversation)
        };
    }

    public async Task<GenerateConversationRepresentation> GenerateAsync(GenerateConversationRequest request)
    {
        var learnerName = Truncate(request.LearnerName?.Trim(),
            GeneralConstants.ConversationParticipantNameMaxLength);

        if (string.IsNullOrWhiteSpace(learnerName))
            learnerName = "Me";

        var avoidContexts = await DbContext.Conversations
            .AsNoTracking()
            .Where(conversation => conversation.UserId == UserId && conversation.Language == request.Language)
            .Select(conversation => conversation.Context)
            .ToListAsync();

        var previousContext = Truncate(request.PreviousContext?.Trim(),
            GeneralConstants.ConversationContextMaxLength);

        if (!string.IsNullOrWhiteSpace(previousContext))
            avoidContexts.Add(previousContext);

        var level = await LanguageSettingsService.GetLevelAsync(request.Language);

        var generated = await AiService.GenerateSetupAsync(request.Language, level, learnerName,
            avoidContexts);

        if (!generated.IsSuccess)
            return new GenerateConversationRepresentation { Error = generated.ErrorMessage };

        var usedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { learnerName };

        var participants = (generated.Value.Participants ?? [])
            .Select(participant => new GeneratedConversationParticipantRepresentation
            {
                Name = Truncate(participant.Name?.Trim(), GeneralConstants.ConversationParticipantNameMaxLength),
                Description = Truncate(participant.Description?.Trim(),
                    GeneralConstants.ConversationParticipantDescriptionMaxLength),
                Gender = Enum.TryParse<ParticipantGender>(participant.Gender, out var gender)
                    ? gender
                    : ParticipantGender.Unspecified
            })
            .Where(participant => !string.IsNullOrWhiteSpace(participant.Name) && usedNames.Add(participant.Name))
            .Take(GeneralConstants.ConversationGenerateMaxParticipantsCount - 1)
            .ToList();

        var context = Truncate(generated.Value.Context?.Trim(), GeneralConstants.ConversationContextMaxLength);

        if (string.IsNullOrWhiteSpace(context) || participants.Count == 0)
            return new GenerateConversationRepresentation
            {
                Error = "The language model returned an incomplete conversation. Try again."
            };

        return new GenerateConversationRepresentation
        {
            Context = context,
            LearnerDescription = Truncate(generated.Value.LearnerDescription?.Trim(),
                GeneralConstants.ConversationParticipantDescriptionMaxLength),
            Participants = participants
        };
    }

    public async Task<UpdateConversationRepresentation> UpdateAsync(int conversationId,
        UpdateConversationRequest request)
    {
        var conversation = await LoadForWriteAsync(conversationId);

        if (conversation == null)
            return null;

        var problem = GetStructuralProblem(request.Context, request.Participants);

        if (problem != null)
            return new UpdateConversationRepresentation { IsUpdated = false, Reason = problem };

        var participantsById = conversation.Participants.ToDictionary(participant => participant.Id);

        if (request.Participants.Count != participantsById.Count
            || request.Participants.Any(participant => !participantsById.ContainsKey(participant.Id)))
            return new UpdateConversationRepresentation
            {
                IsUpdated = false,
                Reason = "The participants of a conversation cannot be added or removed."
            };

        if (request.Participants.Any(participant =>
                participantsById[participant.Id].IsUser != participant.IsUser))
            return new UpdateConversationRepresentation
            {
                IsUpdated = false,
                Reason = "The participant who is you cannot be changed."
            };

        var context = request.Context.Trim();

        var aiParticipants = request.Participants
            .Select(participant => new AiParticipant(participant.Name.Trim(),
                participant.Description?.Trim(), participant.IsUser))
            .ToList();

        var setup = await AiService.ValidateSetupAsync(conversation.Language, context, aiParticipants);

        if (!setup.IsSuccess)
            return new UpdateConversationRepresentation { IsUpdated = false, Reason = setup.ErrorMessage };

        if (!setup.Value.IsSufficient)
            return new UpdateConversationRepresentation
            {
                IsUpdated = false,
                Reason = BuildSetupReason(setup.Value),
                Issues = BuildSetupIssues(setup.Value, aiParticipants)
            };

        var voices = ResolveVoices(request.Participants, setup.Value.Voices);

        conversation.Context = context;
        conversation.AutoFormat = request.AutoFormat;
        conversation.UseLearningWords = request.UseLearningWords;
        conversation.SendImmediately = request.SendImmediately;

        foreach (var participant in request.Participants)
        {
            var stored = participantsById[participant.Id];

            stored.Name = participant.Name.Trim();
            stored.Description = participant.Description?.Trim();
            stored.Gender = participant.Gender;
            stored.Voice = voices[stored.Name];
        }

        await DbContext.SaveChangesAsync();

        return new UpdateConversationRepresentation
        {
            IsUpdated = true,
            Conversation = MapConversation(conversation)
        };
    }

    public async Task<FormatConversationMessageRepresentation> FormatMessageAsync(int conversationId,
        FormatConversationMessageRequest request)
    {
        var conversation = await LoadForWriteAsync(conversationId);

        if (conversation == null)
            return null;

        var text = request.Text?.Trim();

        if (string.IsNullOrWhiteSpace(text))
            return new FormatConversationMessageRepresentation { Text = string.Empty };

        if (text.Length > GeneralConstants.ConversationMessageMaxLength)
            return new FormatConversationMessageRepresentation
            {
                Error = $"A line must be under {GeneralConstants.ConversationMessageMaxLength} characters."
            };

        var formatted = await AiService.FormatMessageAsync(conversation.Language, conversation.Context,
            BuildAiParticipants(conversation),
            BuildHistory(conversation, GeneralConstants.ConversationFormatHistoryMessagesCount), text,
            BuildAlternatives(request.Alternatives, text));

        if (!formatted.IsSuccess)
            return new FormatConversationMessageRepresentation { Error = formatted.ErrorMessage };

        return new FormatConversationMessageRepresentation
        {
            Text = string.IsNullOrWhiteSpace(formatted.Value.Text) ? text : formatted.Value.Text.Trim()
        };
    }

    public async Task<ConversationTurnRepresentation> TurnAsync(int conversationId)
    {
        var conversation = await LoadForWriteAsync(conversationId);

        if (conversation == null)
            return null;

        var learner = conversation.Participants.FirstOrDefault(participant => participant.IsUser);
        var pinned = conversation.Participants
            .FirstOrDefault(participant => participant.Id == conversation.NextSpeakerId);

        if (pinned != null && pinned.IsUser)
            return new ConversationTurnRepresentation { IsUserTurn = true };

        if (learner != null && HasConsecutiveAiTurns(conversation))
        {
            conversation.NextSpeakerId = learner.Id;
            await DbContext.SaveChangesAsync();

            return new ConversationTurnRepresentation { IsUserTurn = true };
        }

        await UpdateSummaryAsync(conversation);

        var level = await LanguageSettingsService.GetLevelAsync(conversation.Language);

        var turn = await AiService.GetNextTurnAsync(conversation.Language, level, conversation.Context,
            BuildAiParticipants(conversation), conversation.Summary, BuildHistory(conversation), pinned?.Name,
            await GetLearningWordsAsync(conversation));

        if (!turn.IsSuccess)
            return new ConversationTurnRepresentation { Error = turn.ErrorMessage };

        if (turn.Value.Declined)
            return new ConversationTurnRepresentation
            {
                Error = "The language model would not write this line. This usually means the scene " +
                        "asks it to speak as a real, identifiable person - give that participant an " +
                        "invented name, or soften the context, and try again."
            };

        var text = Truncate(turn.Value.Text?.Trim(), GeneralConstants.ConversationMessageMaxLength);

        if (string.IsNullOrWhiteSpace(text))
            return new ConversationTurnRepresentation
            {
                Error = "The language model returned an empty line. Try again."
            };

        var joining = AddJoiningParticipant(conversation, turn.Value);

        var speaker = pinned
                      ?? FindParticipant(conversation, turn.Value.Speaker)
                      ?? conversation.Participants.FirstOrDefault(participant => !participant.IsUser);

        if (speaker == null)
            return new ConversationTurnRepresentation
            {
                Error = "This conversation has no participant who can speak."
            };

        var message = new ConversationMessage
        {
            Participant = speaker,
            Text = text,
            CreatedDate = DateTime.UtcNow,
            ValidationStatus = MessageValidationStatus.NotApplicable
        };

        conversation.Messages.Add(message);
        conversation.LastActivityDate = DateTime.UtcNow;

        conversation.NextSpeaker = FindParticipant(conversation, turn.Value.NextSpeaker)
                                   ?? NextParticipantAfter(conversation, speaker);

        if (learner != null && HasConsecutiveAiTurns(conversation))
            conversation.NextSpeaker = learner;

        await DbContext.SaveChangesAsync();

        return new ConversationTurnRepresentation
        {
            Message = MapMessage(message),
            NewParticipant = joining == null ? null : MapParticipant(joining),
            IsUserTurn = IsUserTurn(conversation)
        };
    }

    public async Task<ConversationTurnRepresentation> PostMessageAsync(int conversationId,
        SubmitConversationMessageRequest request)
    {
        var conversation = await LoadForWriteAsync(conversationId);

        if (conversation == null)
            return null;

        var learner = conversation.Participants.FirstOrDefault(participant => participant.IsUser);

        if (learner == null)
            return new ConversationTurnRepresentation
            {
                Error = "This conversation has no learner participant."
            };

        var text = request.Text?.Trim();

        if (string.IsNullOrWhiteSpace(text))
            return new ConversationTurnRepresentation
            {
                IsUserTurn = true,
                Error = "Say or type something first."
            };

        if (text.Length > GeneralConstants.ConversationMessageMaxLength)
            return new ConversationTurnRepresentation
            {
                IsUserTurn = true,
                Error = $"That is too long. Keep it under {GeneralConstants.ConversationMessageMaxLength} characters."
            };

        if (!IsUserTurn(conversation))
            return new ConversationTurnRepresentation { Error = "It is not your turn yet." };

        var previous = conversation.Messages.OrderByDescending(message => message.Id).FirstOrDefault();

        var userMessage = new ConversationMessage
        {
            Participant = learner,
            Text = text,
            CreatedDate = DateTime.UtcNow,
            ValidationStatus = MessageValidationStatus.NotValidated
        };

        var knownRules = await DbContext.GetKnownMistakeRulesAsync(UserId, conversation.Language);
        var level = await LanguageSettingsService.GetLevelAsync(conversation.Language);

        var validation = await AiService.ValidateMessageAsync(conversation.Language, level,
            conversation.Context, previous?.Participant?.Name, previous?.Text, text, knownRules);

        if (validation.IsSuccess)
        {
            var errors = (validation.Value.Errors ?? [])
                .Take(GeneralConstants.ConversationMaxValidationErrorsCount)
                .ToList();

            userMessage.ValidationStatus = errors.Count > 0
                ? MessageValidationStatus.HasErrors
                : MessageValidationStatus.Ok;
            userMessage.ValidationSummary = Truncate(validation.Value.Summary,
                GeneralConstants.ConversationValidationSummaryMaxLength);
            userMessage.ValidationErrorsJson = errors.Count > 0
                ? JsonSerializer.Serialize(errors)
                : null;
            userMessage.Points = await AwardPointsAsync(conversation, validation.Value.Points);

            await DbContext.RecordMistakesAsync(UserId, conversation.Language, userMessage, errors);
        }

        conversation.Messages.Add(userMessage);
        conversation.LastActivityDate = DateTime.UtcNow;
        conversation.NextSpeakerId = null;

        await DbContext.MarkExerciseCompletedAsync(UserId, conversation.Language, ExerciseType.Conversation);
        await DbContext.SaveChangesAsync();

        return new ConversationTurnRepresentation
        {
            Message = MapMessage(userMessage),
            IsUserTurn = false
        };
    }

    private async Task<int> AwardPointsAsync(Conversation conversation, int points)
    {
        var statistic = await DbContext.GetOrCreateTodayStatisticAsync(UserId, conversation.Language);

        var remaining = GeneralConstants.ConversationMaxDailyPoints - statistic.ConversationPercentage;

        if (remaining <= 0)
            return 0;

        var awarded = Math.Min(
            Math.Clamp(points, GeneralConstants.ConversationMessageMinPoints,
                GeneralConstants.ConversationMessageMaxPoints),
            remaining);

        statistic.Percentage += awarded;
        statistic.ConversationPercentage += awarded;

        return awarded;
    }

    public async Task<bool> DeleteAsync(int conversationId)
    {
        var conversation = await DbContext.Conversations
            .Include(entity => entity.Participants)
            .Include(entity => entity.Messages)
            .FirstOrDefaultAsync(entity => entity.Id == conversationId && entity.UserId == UserId);

        if (conversation == null)
            return false;

        if (conversation.NextSpeakerId != null)
        {
            conversation.NextSpeaker = null;
            conversation.NextSpeakerId = null;

            await DbContext.SaveChangesAsync();
        }

        DbContext.ConversationMessages.RemoveRange(conversation.Messages);
        DbContext.ConversationParticipants.RemoveRange(conversation.Participants);
        DbContext.Conversations.Remove(conversation);

        await DbContext.SaveChangesAsync();

        return true;
    }

    private Task<Conversation> LoadForWriteAsync(int conversationId) =>
        DbContext.Conversations
            .Include(entity => entity.Participants)
            .Include(entity => entity.Messages)
            .ThenInclude(message => message.Participant)
            .FirstOrDefaultAsync(entity => entity.Id == conversationId && entity.UserId == UserId);

    private static bool HasConsecutiveAiTurns(Conversation conversation)
    {
        var recent = conversation.Messages
            .OrderByDescending(message => message.Id)
            .Take(GeneralConstants.ConversationMaxConsecutiveAiTurns)
            .ToList();

        return recent.Count == GeneralConstants.ConversationMaxConsecutiveAiTurns
               && recent.All(message => !message.Participant.IsUser);
    }

    private static ConversationParticipant FindParticipant(Conversation conversation, string name) =>
        string.IsNullOrWhiteSpace(name)
            ? null
            : conversation.Participants.FirstOrDefault(participant =>
                string.Equals(participant.Name, name, StringComparison.OrdinalIgnoreCase));

    private static ConversationParticipant NextParticipantAfter(Conversation conversation,
        ConversationParticipant speaker)
    {
        var ordered = conversation.Participants
            .OrderBy(participant => participant.Id == 0 ? int.MaxValue : participant.Id)
            .ToList();
        var index = ordered.IndexOf(speaker);

        return index < 0 ? null : ordered[(index + 1) % ordered.Count];
    }

    private static ConversationParticipant AddJoiningParticipant(Conversation conversation,
        AiConversationTurn turn)
    {
        var joiningName = string.IsNullOrWhiteSpace(turn.JoiningName) && FindParticipant(conversation, turn.Speaker) == null
            ? turn.Speaker
            : turn.JoiningName;

        var name = Truncate(joiningName?.Trim(), GeneralConstants.ConversationParticipantNameMaxLength);

        if (string.IsNullOrWhiteSpace(name) || FindParticipant(conversation, name) != null)
            return null;

        var gender = Enum.TryParse<ParticipantGender>(turn.JoiningGender, out var parsed)
            ? parsed
            : ParticipantGender.Unspecified;

        var description = Truncate(turn.JoiningDescription?.Trim(),
            GeneralConstants.ConversationParticipantDescriptionMaxLength);

        var participant = new ConversationParticipant
        {
            Name = name,
            Description = string.IsNullOrWhiteSpace(description) ? name : description,
            IsUser = false,
            Gender = gender,
            Voice = VoiceResolver.Resolve([(name, gender)],
                [new AiParticipantVoice { Name = name, Voice = turn.JoiningVoice }])[name]
        };

        conversation.Participants.Add(participant);

        return participant;
    }

    private static List<AiParticipant> BuildAiParticipants(Conversation conversation) =>
        conversation.Participants
            .OrderBy(participant => participant.Id)
            .Select(participant => new AiParticipant(participant.Name, participant.Description,
                participant.IsUser))
            .ToList();

    private static Dictionary<string, ParticipantVoice> ResolveVoices(
        IEnumerable<CreateConversationParticipantRequest> participants,
        List<AiParticipantVoice> assigned) =>
        VoiceResolver.Resolve(participants.Select(participant => (participant.Name, participant.Gender)).ToList(),
            assigned);

    private static readonly WordLearningProgress[] learningProgresses =
    [
        WordLearningProgress.None,
        WordLearningProgress.One,
        WordLearningProgress.Two
    ];

    private async Task<List<string>> GetLearningWordsAsync(Conversation conversation)
    {
        if (!conversation.UseLearningWords)
            return [];

        return await DbContext.Words
            .AsNoTracking()
            .Where(word => word.Language == conversation.Language &&
                           word.UserWordLearningProgresses.Any(progress =>
                               progress.UserId == UserId &&
                               EF.Constant(learningProgresses).Contains(progress.WordLearningProgress)))
            .OrderBy(word => word.Value)
            .Select(word => word.Value.ToLower())
            .Take(GeneralConstants.ConversationLearningWordsMaxCount)
            .ToListAsync();
    }

    private async Task UpdateSummaryAsync(Conversation conversation)
    {
        var dropped = conversation.Messages
            .OrderBy(message => message.Id)
            .SkipLast(GeneralConstants.ConversationHistoryMessagesCount)
            .Where(message => message.Id > (conversation.SummaryMessageId ?? 0))
            .ToList();

        if (dropped.Count < GeneralConstants.ConversationSummaryMinMessagesCount)
            return;

        var summary = await AiService.SummarizeAsync(conversation.Language, conversation.Context,
            BuildAiParticipants(conversation), conversation.Summary,
            dropped.Select(message => new AiMessage(message.Participant.Name, message.Text)).ToList());

        if (!summary.IsSuccess || string.IsNullOrWhiteSpace(summary.Value.Summary))
            return;

        conversation.Summary = Truncate(summary.Value.Summary.Trim(),
            GeneralConstants.ConversationSummaryMaxLength);
        conversation.SummaryMessageId = dropped[^1].Id;

        await DbContext.SaveChangesAsync();
    }

    private static List<AiMessage> BuildHistory(Conversation conversation,
        int count = GeneralConstants.ConversationHistoryMessagesCount) =>
        conversation.Messages
            .OrderByDescending(message => message.Id)
            .Take(count)
            .OrderBy(message => message.Id)
            .Select(message => new AiMessage(message.Participant.Name, message.Text))
            .ToList();

    private static List<string> BuildAlternatives(List<string> alternatives, string text) =>
        (alternatives ?? [])
        .Select(alternative => alternative?.Trim())
        .Where(alternative => !string.IsNullOrWhiteSpace(alternative)
                              && alternative.Length <= GeneralConstants.ConversationMessageMaxLength
                              && !string.Equals(alternative, text, StringComparison.Ordinal))
        .Distinct()
        .Take(GeneralConstants.ConversationFormatMaxAlternativesCount)
        .ToList();

    private static string GetStructuralProblem(string context,
        IReadOnlyList<CreateConversationParticipantRequest> requestParticipants)
    {
        if (string.IsNullOrWhiteSpace(context))
            return "A context is required: describe the scene the conversation happens in.";

        if (context.Trim().Length > GeneralConstants.ConversationContextMaxLength)
            return $"The context must be under {GeneralConstants.ConversationContextMaxLength} characters.";

        var participants = requestParticipants ?? [];

        if (participants.Count < GeneralConstants.ConversationMinParticipantsCount)
            return "Add at least one other participant besides yourself.";

        if (participants.Count(participant => participant.IsUser) != 1)
            return "Exactly one participant must be you.";

        if (participants.Any(participant => string.IsNullOrWhiteSpace(participant.Name)))
            return "Every participant needs a name.";

        if (participants.Any(participant =>
                participant.Name.Trim().Length > GeneralConstants.ConversationParticipantNameMaxLength))
            return $"Participant names must be under {GeneralConstants.ConversationParticipantNameMaxLength} characters.";

        if (participants.Any(participant => string.IsNullOrWhiteSpace(participant.Description)))
            return "Every participant needs a description.";

        if (participants.Any(participant =>
                participant.Description.Trim().Length > GeneralConstants.ConversationParticipantDescriptionMaxLength))
            return $"Participant descriptions must be under {GeneralConstants.ConversationParticipantDescriptionMaxLength} characters.";

        return participants.Select(participant => participant.Name.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase).Count() != participants.Count
            ? "Every participant needs a different name."
            : null;
    }

    private static string BuildSetupReason(AiConversationSetup setup) =>
        string.IsNullOrWhiteSpace(setup.Reason)
            ? "This setup does not have enough detail to hold a conversation."
            : setup.Reason.Trim();

    private static List<ConversationSetupIssueRepresentation> BuildSetupIssues(AiConversationSetup setup,
        IReadOnlyList<AiParticipant> participants) =>
        (setup.Issues ?? [])
        .Where(issue => !string.IsNullOrWhiteSpace(issue.Problem))
        .Select(issue => new
        {
            Issue = issue,
            Participant = issue.Field == "participant"
                ? participants.FirstOrDefault(participant =>
                    string.Equals(participant.Name, issue.ParticipantName?.Trim(),
                        StringComparison.OrdinalIgnoreCase))
                : null
        })
        .Where(item => item.Issue.Field == "context" || item.Participant != null)
        .Take(GeneralConstants.ConversationMaxSetupIssuesCount)
        .Select(item => new ConversationSetupIssueRepresentation
        {
            ParticipantName = item.Participant?.Name,
            Problem = item.Issue.Problem.Trim(),
            Suggestion = item.Issue.Suggestion?.Trim()
        })
        .ToList();

    private static string BuildTitle(string title, string context) =>
        Truncate(string.IsNullOrWhiteSpace(title) ? context : title.Trim(),
            GeneralConstants.ConversationTitleMaxLength);

    private static string Truncate(string value, int maxLength) =>
        string.IsNullOrEmpty(value) || value.Length <= maxLength ? value : value[..maxLength];

    private static bool IsUserTurn(Conversation conversation) =>
        conversation.NextSpeaker?.IsUser
        ?? conversation.Participants.Any(participant =>
            participant.Id == conversation.NextSpeakerId && participant.IsUser);

    private static ConversationRepresentation MapConversation(Conversation conversation) =>
        new()
        {
            Id = conversation.Id,
            Title = conversation.Title,
            Context = conversation.Context,
            AutoFormat = conversation.AutoFormat,
            UseLearningWords = conversation.UseLearningWords,
            SendImmediately = conversation.SendImmediately,
            Language = conversation.Language,
            CreatedDate = conversation.CreatedDate,
            LastActivityDate = conversation.LastActivityDate,
            IsUserTurn = IsUserTurn(conversation),
            Participants = conversation.Participants
                .OrderBy(participant => participant.Id)
                .Select(MapParticipant)
                .ToList(),
            Messages = conversation.Messages
                .OrderBy(message => message.Id)
                .Select(MapMessage)
                .ToList()
        };

    private static ConversationParticipantRepresentation MapParticipant(ConversationParticipant participant) =>
        new()
        {
            Id = participant.Id,
            Name = participant.Name,
            Description = participant.Description,
            IsUser = participant.IsUser,
            Gender = participant.Gender,
            Voice = participant.Voice
        };

    private static ConversationMessageRepresentation MapMessage(ConversationMessage message) =>
        new()
        {
            Id = message.Id,
            ParticipantId = message.ParticipantId,
            ParticipantName = message.Participant?.Name,
            IsUser = message.Participant?.IsUser ?? false,
            Text = message.Text,
            CreatedDate = message.CreatedDate,
            ValidationStatus = message.ValidationStatus,
            ValidationSummary = message.ValidationSummary,
            ValidationErrors = string.IsNullOrWhiteSpace(message.ValidationErrorsJson)
                ? []
                : JsonSerializer.Deserialize<List<AiValidationError>>(message.ValidationErrorsJson,
                    jsonSerializerOptions),
            Points = message.Points
        };

    private static IQueryable<Conversation> SortConversationsQuery(IQueryable<Conversation> query,
        SearchConversationsRequest request)
    {
        var ascending = SortOrderConstants.Ascending.Equals(request.SortOrder,
            StringComparison.OrdinalIgnoreCase);

        var sortBy = string.IsNullOrWhiteSpace(request.SortBy)
            ? ConversationFieldConstants.LastActivityDate
            : request.SortBy;

        return sortBy switch
        {
            _ when sortBy.Equals(ConversationFieldConstants.Title, StringComparison.OrdinalIgnoreCase) =>
                ascending
                    ? query.OrderBy(conversation => conversation.Title)
                        .ThenBy(conversation => conversation.Id)
                    : query.OrderByDescending(conversation => conversation.Title)
                        .ThenByDescending(conversation => conversation.Id),
            _ when sortBy.Equals(ConversationFieldConstants.CreatedDate, StringComparison.OrdinalIgnoreCase) =>
                ascending
                    ? query.OrderBy(conversation => conversation.CreatedDate)
                        .ThenBy(conversation => conversation.Id)
                    : query.OrderByDescending(conversation => conversation.CreatedDate)
                        .ThenByDescending(conversation => conversation.Id),
            _ => ascending
                ? query.OrderBy(conversation => conversation.LastActivityDate)
                    .ThenBy(conversation => conversation.Id)
                : query.OrderByDescending(conversation => conversation.LastActivityDate)
                    .ThenByDescending(conversation => conversation.Id)
        };
    }
}
