namespace Api.Representations;

public class SpeechTokenRepresentation
{
    public string AccessToken { get; set; }
    public int ExpiresIn { get; set; }
    public string Model { get; set; }
    public string Error { get; set; }
}
