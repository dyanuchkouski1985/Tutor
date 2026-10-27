using Api.Representations;
using Api.Requests.Speech;

namespace Api.Interfaces.Services;

public interface ISpeechService
{
    Task<SpeechTokenRepresentation> GetTokenAsync();

    Task<SpeechAudioRepresentation> SpeakAsync(SpeakRequest request);
}
