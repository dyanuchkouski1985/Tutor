using Api.Enums;

namespace Api.Requests.Speech;

public class SpeakRequest
{
    public string Text { get; set; }
    public ParticipantVoice Voice { get; set; }
    public int Order { get; set; }
}
