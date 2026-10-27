using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using Api.Constants;
using Api.Interfaces.Services;
using Api.Representations;
using Api.Requests.Speech;
using Api.Speech;

namespace Api.Services.BusinessLogic;

public class SpeechService(
    DeepgramOptions options,
    IHttpClientFactory httpClientFactory,
    ILogger<SpeechService> logger)
    : ISpeechService
{
    public async Task<SpeechTokenRepresentation> GetTokenAsync()
    {
        if (!options.IsConfigured)
            return new SpeechTokenRepresentation { Error = "Speech recognition is not configured: Deepgram:ApiKey is missing." };

        var httpClient = httpClientFactory.CreateClient(DeepgramConstants.HttpClientName);

        using var request = new HttpRequestMessage(HttpMethod.Post, "v1/auth/grant");
        request.Headers.Authorization = new AuthenticationHeaderValue("Token", options.ApiKey);
        request.Content = JsonContent.Create(new { ttl_seconds = options.TokenTtlSeconds });

        try
        {
            using var response = await httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Deepgram token grant failed with {StatusCode}: {Body}", response.StatusCode,
                    await response.Content.ReadAsStringAsync());

                return new SpeechTokenRepresentation { Error = "The speech service refused to issue a token." };
            }

            var grant = await response.Content.ReadFromJsonAsync<DeepgramGrant>();

            if (string.IsNullOrWhiteSpace(grant?.AccessToken))
                return new SpeechTokenRepresentation { Error = "The speech service returned an empty token." };

            return new SpeechTokenRepresentation
            {
                AccessToken = grant.AccessToken,
                ExpiresIn = grant.ExpiresIn,
                Model = options.Model
            };
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Deepgram token grant failed.");
            return new SpeechTokenRepresentation { Error = "The speech service could not be reached." };
        }
    }

    public async Task<SpeechAudioRepresentation> SpeakAsync(SpeakRequest request)
    {
        if (!options.IsConfigured)
            return new SpeechAudioRepresentation { Error = "Speech synthesis is not configured: Deepgram:ApiKey is missing." };

        var text = request.Text?.Trim();

        if (string.IsNullOrWhiteSpace(text))
            return new SpeechAudioRepresentation { Error = "There is no text to speak." };

        if (text.Length > GeneralConstants.ConversationMessageMaxLength)
            return new SpeechAudioRepresentation
            {
                Error = $"A line must be under {GeneralConstants.ConversationMessageMaxLength} characters."
            };

        var httpClient = httpClientFactory.CreateClient(DeepgramConstants.HttpClientName);
        var model = DeepgramVoices.GetModel(request.Voice, request.Order);

        using var speakRequest = new HttpRequestMessage(HttpMethod.Post, $"v1/speak?model={model}");
        speakRequest.Headers.Authorization = new AuthenticationHeaderValue("Token", options.ApiKey);
        speakRequest.Content = JsonContent.Create(new { text = text });

        HttpResponseMessage response = null;

        try
        {
            response = await httpClient.SendAsync(speakRequest, HttpCompletionOption.ResponseHeadersRead);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Deepgram speak failed with {StatusCode} for {Model}: {Body}", response.StatusCode,
                    model, await response.Content.ReadAsStringAsync());

                response.Dispose();
                return new SpeechAudioRepresentation { Error = "The speech service could not voice this line." };
            }

            return new SpeechAudioRepresentation
            {
                Audio = await response.Content.ReadAsStreamAsync(),
                ContentType = response.Content.Headers.ContentType?.MediaType ?? "audio/mpeg",
                Source = response
            };
        }
        catch (Exception exception)
        {
            response?.Dispose();
            logger.LogError(exception, "Deepgram speak failed for {Model}.", model);
            return new SpeechAudioRepresentation { Error = "The speech service could not be reached." };
        }
    }

    private sealed class DeepgramGrant
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; }

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }
    }
}
