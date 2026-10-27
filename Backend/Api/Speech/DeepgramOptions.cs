namespace Api.Speech;

public class DeepgramOptions
{
    public string ApiKey { get; set; }
    public string Model { get; set; }
    public int TokenTtlSeconds { get; set; }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}
