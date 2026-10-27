using System.Text.Json;
using Anthropic.Exceptions;
using Anthropic.Models.Messages;
using Api.Enums;

namespace Api.Ai;

public abstract class AiServiceBase(AnthropicClientProvider clientProvider, ILogger logger)
{
    private const string apiKeyMissingMessage =
        "AI features are not configured: Anthropic:ApiKey is missing.";

    private static readonly JsonSerializerOptions jsonSerializerOptions =
        new() { PropertyNameCaseInsensitive = true };

    protected static readonly string[] mistakeCategories =
    [
        "tense", "aspect", "verb-form", "agreement", "case", "article", "preposition",
        "word-order", "word-choice", "pronoun", "negation", "other"
    ];

    protected AnthropicClientProvider ClientProvider { get; } = clientProvider;
    protected ILogger Logger { get; } = logger;

    public bool IsConfigured => ClientProvider.IsConfigured;

    protected async Task<AiResult<T>> CallAsync<T>(string model, int maxTokens, string systemPrompt,
        string userContent, Dictionary<string, JsonElement> schema, Effort? effort, string callName)
        where T : class
    {
        if (!ClientProvider.IsConfigured)
            return AiResult<T>.Failure(apiKeyMissingMessage);

        var outputConfig = effort.HasValue
            ? new OutputConfig
            {
                Effort = effort.Value,
                Format = new JsonOutputFormat { Schema = schema }
            }
            : new OutputConfig { Format = new JsonOutputFormat { Schema = schema } };

        Message response;

        try
        {
            response = await ClientProvider.Client.Messages.Create(new MessageCreateParams
            {
                Model = model,
                MaxTokens = maxTokens,
                System = new List<TextBlockParam> { new() { Text = systemPrompt } },
                Messages = [new() { Role = Role.User, Content = userContent }],
                OutputConfig = outputConfig
            });
        }
        catch (AnthropicRateLimitException exception)
        {
            Logger.LogWarning(exception, "Anthropic rate limit on {Call}.", callName);
            return AiResult<T>.Failure("The language model is busy right now. Try again in a moment.");
        }
        catch (Anthropic5xxException exception)
        {
            Logger.LogWarning(exception, "Anthropic is unavailable on {Call}.", callName);
            return AiResult<T>.Failure("The language model is overloaded right now. Try again in a few minutes.");
        }
        catch (AnthropicApiException exception)
        {
            Logger.LogError(exception, "Anthropic API error on {Call}.", callName);
            return AiResult<T>.Failure("The language model could not process the request.");
        }
        catch (Exception exception)
        {
            Logger.LogError(exception, "Anthropic call {Call} failed.", callName);
            return AiResult<T>.Failure("The language model could not be reached. Try again in a moment.");
        }

        if (response.StopReason == "refusal")
        {
            Logger.LogWarning("Anthropic refused {Call}.", callName);
            return AiResult<T>.Failure("The language model declined this request. Try rewording it.");
        }

        if (response.StopReason == "max_tokens")
        {
            Logger.LogError("Anthropic response for {Call} hit max_tokens: {Used} of {MaxTokens}.",
                callName, response.Usage?.OutputTokens, maxTokens);

            return AiResult<T>.Failure("The language model returned an incomplete response. Try again.");
        }

        var json = string.Concat(response.Content
            .Select(block => block.Value)
            .OfType<TextBlock>()
            .Select(block => block.Text));

        if (string.IsNullOrWhiteSpace(json))
        {
            Logger.LogError("Anthropic returned no text content for {Call}.", callName);
            return AiResult<T>.Failure("The language model returned an empty response. Try again.");
        }

        try
        {
            var value = JsonSerializer.Deserialize<T>(json, jsonSerializerOptions);

            return value == null
                ? AiResult<T>.Failure("The language model returned an empty response. Try again.")
                : AiResult<T>.Success(value);
        }
        catch (JsonException exception)
        {
            Logger.LogError(exception, "Malformed JSON from Anthropic on {Call}: {Payload}", callName, json);
            return AiResult<T>.Failure("The language model returned an unexpected response. Try again.");
        }
    }

    protected static Dictionary<string, JsonElement> BuildSchema(object properties, string[] required) =>
        new()
        {
            ["type"] = JsonSerializer.SerializeToElement("object"),
            ["properties"] = JsonSerializer.SerializeToElement(properties),
            ["required"] = JsonSerializer.SerializeToElement(required),
            ["additionalProperties"] = JsonSerializer.SerializeToElement(false)
        };

    protected static string GetLanguageName(Language language) =>
        language switch
        {
            Language.Polish => "Polish",
            _ => "English"
        };

    protected static string DescribeLevel(LanguageLevel level) =>
        level switch
        {
            LanguageLevel.A1 =>
                "A1 (beginner): very short, simple sentences; only the most common everyday words; " +
                "mostly present tense; no idioms, slang or set phrases beyond basic greetings.",
            LanguageLevel.A2 =>
                "A2 (elementary): short, simple sentences; common everyday vocabulary; basic past " +
                "and future forms; no idioms or slang.",
            LanguageLevel.B1 =>
                "B1 (intermediate): clear everyday language; simple and some compound sentences; " +
                "common set phrases; an idiom only when its meaning is obvious from context.",
            LanguageLevel.B2 =>
                "B2 (upper intermediate): natural everyday language; varied tenses and sentence " +
                "structures; common idioms and colloquial phrases.",
            LanguageLevel.C1 =>
                "C1 (advanced): fully natural language with idioms, colloquial phrasing, nuance and " +
                "complex sentence structures.",
            _ =>
                "C2 (proficient): native-level language with no simplification at all, including " +
                "slang, wordplay and subtle nuance."
        };

    protected static string GetTranslationLanguageName(TranslationLanguage translationLanguage) =>
        translationLanguage switch
        {
            TranslationLanguage.Polish => "Polish",
            TranslationLanguage.English => "English",
            _ => "Russian"
        };
}
