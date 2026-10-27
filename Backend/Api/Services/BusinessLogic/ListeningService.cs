using System.Security.Cryptography;
using System.Text.Json;
using Api.Ai;
using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Api.Requests.Listening;
using Api.Speech;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Api.Services.BusinessLogic;

public class ListeningService(
    TutorContext dbContext,
    ISecurityContext securityContext,
    IListeningAiService aiService,
    ILanguageSettingsService languageSettingsService,
    IDataProtectionProvider dataProtectionProvider,
    IMemoryCache memoryCache)
    : IListeningService
{
    private const string brokenSceneMessage = "The scene came out broken. Please try again.";

    private static readonly WordLearningProgress[] learningProgresses =
    [
        WordLearningProgress.None,
        WordLearningProgress.One,
        WordLearningProgress.Two
    ];

    private TutorContext DbContext { get; } = dbContext;
    private Guid UserId { get; } = Guid.Parse(securityContext.GetCurrentUserId());
    private IListeningAiService AiService { get; } = aiService;
    private ILanguageSettingsService LanguageSettingsService { get; } = languageSettingsService;

    private ITimeLimitedDataProtector Protector { get; } = dataProtectionProvider
        .CreateProtector("Listening.AnswerKey")
        .ToTimeLimitedDataProtector();

    private IMemoryCache MemoryCache { get; } = memoryCache;

    public static bool IsSupported(Language language) => language == Language.English;

    public async Task<ListeningExerciseRepresentation> GetExerciseAsync(Language language, TranslationLanguage translationLanguage)
    {
        if (!IsSupported(language))
            return new ListeningExerciseRepresentation();

        var words = await DbContext.UserWordLearningProgresses
            .AsNoTracking()
            .Where(progress => progress.UserId == UserId
                               && progress.Word.Language == language
                               && EF.Constant(learningProgresses).Contains(progress.WordLearningProgress))
            .OrderBy(_ => Guid.NewGuid())
            .Select(progress => progress.Word.Value)
            .Take(GeneralConstants.ListeningWordsCount)
            .ToListAsync();

        var level = await LanguageSettingsService.GetLevelAsync(language);

        var generated = await AiService.GenerateSceneAsync(language, level, translationLanguage, words);

        if (!generated.IsSuccess)
            return new ListeningExerciseRepresentation { Error = generated.ErrorMessage };

        return BuildExercise(generated.Value) ?? new ListeningExerciseRepresentation { Error = brokenSceneMessage };
    }

    public async Task<ListeningAnswerRepresentation> AnswerAsync(AnswerListeningRequest request)
    {
        var key = ReadKey(request.Key);

        if (key == null || key.UserId != UserId)
            return new ListeningAnswerRepresentation { Error = "This scene has expired. Start a new one." };

        if (request.QuestionIndex < 0 || request.QuestionIndex >= key.CorrectOptions.Count)
            return new ListeningAnswerRepresentation { Error = "The question is missing." };

        var correctOption = key.CorrectOptions[request.QuestionIndex];
        var isCorrect = request.Answer == correctOption;

        var points = !isCorrect
            ? 0
            : request.IsTextShown
                ? GeneralConstants.ListeningTextShownPoints
                : request.IsReplayed
                    ? GeneralConstants.ListeningReplayedPoints
                    : GeneralConstants.ListeningCorrectPoints;

        var cacheKey = $"listening:{key.Id}:{request.QuestionIndex}";

        if (MemoryCache.TryGetValue(cacheKey, out _))
            points = 0;
        else
            MemoryCache.Set(cacheKey, true, TimeSpan.FromMinutes(GeneralConstants.ListeningKeyLifetimeMinutes));

        if (points > 0)
        {
            var statistic = await DbContext.GetOrCreateTodayStatisticAsync(UserId, request.Language);
            statistic.Percentage += points;

            await DbContext.SaveChangesAsync();
        }

        return new ListeningAnswerRepresentation
        {
            IsCorrect = isCorrect,
            CorrectOption = correctOption,
            Points = points
        };
    }

    private ListeningExerciseRepresentation BuildExercise(AiListeningScene scene)
    {
        var participants = (scene.Participants ?? [])
            .Where(participant => !string.IsNullOrWhiteSpace(participant.Name))
            .DistinctBy(participant => participant.Name.Trim(), StringComparer.OrdinalIgnoreCase)
            .Take(GeneralConstants.ListeningMaxParticipantsCount)
            .ToList();

        if (participants.Count < GeneralConstants.ListeningMinParticipantsCount)
            return null;

        var voices = VoiceResolver.Resolve(
            participants
                .Select(participant => (participant.Name,
                    Enum.TryParse<ParticipantGender>(participant.Gender, true, out var gender)
                        ? gender
                        : ParticipantGender.Unspecified))
                .ToList(),
            participants
                .Select(participant => new AiParticipantVoice { Name = participant.Name, Voice = participant.Voice })
                .ToList());

        var ids = participants
            .Select((participant, index) => (Name: participant.Name.Trim(), Id: index + 1))
            .ToDictionary(item => item.Name, item => item.Id, StringComparer.OrdinalIgnoreCase);

        var lines = (scene.Lines ?? [])
            .Select(line => new
            {
                Speaker = line.Speaker?.Trim() ?? string.Empty,
                Text = line.Text?.Trim(),
                Translation = line.Translation?.Trim()
            })
            .Where(line => !string.IsNullOrWhiteSpace(line.Text)
                           && line.Text.Length <= GeneralConstants.ConversationMessageMaxLength)
            .ToList();

        if (lines.Count < GeneralConstants.ListeningMinLinesCount || lines.Any(line => !ids.ContainsKey(line.Speaker)))
            return null;

        var questions = (scene.Questions ?? [])
            .Select(question => new
            {
                Text = question.Question?.Trim(),
                Answer = question.Answer?.Trim(),
                WrongOptions = (question.WrongOptions ?? [])
                    .Select(option => option?.Trim())
                    .Where(option => !string.IsNullOrWhiteSpace(option))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Where(option => !string.Equals(option, question.Answer?.Trim(),
                        StringComparison.OrdinalIgnoreCase))
                    .Take(GeneralConstants.ListeningMaxWrongOptionsCount)
                    .ToList()
            })
            .Where(question => !string.IsNullOrWhiteSpace(question.Text)
                               && !string.IsNullOrWhiteSpace(question.Answer)
                               && question.WrongOptions.Count >= GeneralConstants.ListeningMinWrongOptionsCount)
            .Take(GeneralConstants.ListeningQuestionsCount)
            .ToList();

        if (questions.Count < GeneralConstants.ListeningQuestionsCount)
            return null;

        var correctOptions = new List<int>();
        var questionRepresentations = new List<ListeningQuestionRepresentation>();

        foreach (var question in questions.OrderBy(_ => Random.Shared.Next()))
        {
            var options = question.WrongOptions.Append(question.Answer).OrderBy(_ => Random.Shared.Next()).ToList();

            correctOptions.Add(options.IndexOf(question.Answer));
            questionRepresentations.Add(new ListeningQuestionRepresentation { Text = question.Text, Options = options });
        }

        return new ListeningExerciseRepresentation
        {
            Situation = scene.Situation?.Trim(),
            Participants = participants
                .Select(participant => new ListeningParticipantRepresentation
                {
                    Id = ids[participant.Name.Trim()],
                    Name = participant.Name.Trim(),
                    Voice = voices[participant.Name.Trim()]
                })
                .ToList(),
            Lines = lines
                .Take(GeneralConstants.ListeningMaxLinesCount)
                .Select(line => new ListeningLineRepresentation
                {
                    ParticipantId = ids[line.Speaker],
                    Text = line.Text,
                    Translation = line.Translation
                })
                .ToList(),
            Questions = questionRepresentations,
            Key = WriteKey(new ListeningKey(Guid.NewGuid(), UserId, correctOptions))
        };
    }

    private string WriteKey(ListeningKey key) =>
        Protector.Protect(JsonSerializer.Serialize(key),
            TimeSpan.FromMinutes(GeneralConstants.ListeningKeyLifetimeMinutes));

    private ListeningKey ReadKey(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        try
        {
            return JsonSerializer.Deserialize<ListeningKey>(Protector.Unprotect(value));
        }
        catch (Exception exception) when (exception is CryptographicException or JsonException or FormatException)
        {
            return null;
        }
    }

    private sealed record ListeningKey(Guid Id, Guid UserId, List<int> CorrectOptions);
}
