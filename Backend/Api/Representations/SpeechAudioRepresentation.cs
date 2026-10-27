namespace Api.Representations;

public class SpeechAudioRepresentation
{
    public Stream Audio { get; set; }
    public string ContentType { get; set; }
    public IDisposable Source { get; set; }
    public string Error { get; set; }
}
