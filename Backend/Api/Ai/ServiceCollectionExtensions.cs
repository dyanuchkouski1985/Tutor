namespace Api.Ai;

internal static class ServiceCollectionExtensions
{
    public static void AddAnthropicServices(this IServiceCollection services, IConfiguration configuration)
    {
        var anthropicOptions = new AnthropicOptions();
        configuration.GetSection("Anthropic").Bind(anthropicOptions);

        services.AddSingleton(anthropicOptions);
        services.AddSingleton<AnthropicClientProvider>();
    }
}
