namespace Api.Speech;

internal static class ServiceCollectionExtensions
{
    public static void AddDeepgramServices(this IServiceCollection services, IConfiguration configuration)
    {
        var deepgramOptions = new DeepgramOptions();
        configuration.GetSection("Deepgram").Bind(deepgramOptions);

        services.AddSingleton(deepgramOptions);
        services.AddHttpClient(DeepgramConstants.HttpClientName,
            client => client.BaseAddress = new Uri(DeepgramConstants.BaseAddress));
    }
}
