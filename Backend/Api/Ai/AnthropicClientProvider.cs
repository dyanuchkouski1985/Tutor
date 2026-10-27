using Anthropic;
using Api.Constants;

namespace Api.Ai;

public class AnthropicClientProvider
{
    private readonly Lazy<AnthropicClient> client;

    public AnthropicClientProvider(AnthropicOptions options)
    {
        Options = options;
        client = new Lazy<AnthropicClient>(() => new AnthropicClient
        {
            ApiKey = options.ApiKey,
            Timeout = TimeSpan.FromSeconds(GeneralConstants.AnthropicRequestTimeoutSeconds),
            MaxRetries = GeneralConstants.AnthropicMaxRetries
        });
    }

    public AnthropicOptions Options { get; }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Options.ApiKey);

    public AnthropicClient Client => client.Value;
}
