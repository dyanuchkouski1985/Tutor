using Api.Enums;

namespace Api.Speech;

public static class DeepgramVoices
{
    private static readonly Dictionary<ParticipantVoice, string[]> voices = new()
    {
        [ParticipantVoice.Boy] = ["arcas", "aries", "hermes"],
        [ParticipantVoice.Man] = ["apollo", "orion", "draco", "hyperion"],
        [ParticipantVoice.ElderlyMan] = ["atlas", "zeus", "saturn"],
        [ParticipantVoice.Girl] = ["iris", "luna", "delia", "cordelia"],
        [ParticipantVoice.Woman] = ["thalia", "andromeda", "pandora", "theia"],
        [ParticipantVoice.ElderlyWoman] = ["athena", "hera", "vesta"],
        [ParticipantVoice.Unknown] = ["asteria", "orpheus", "callista", "mars"]
    };

    public static string GetModel(ParticipantVoice voice, int order)
    {
        var names = voices.GetValueOrDefault(voice, voices[ParticipantVoice.Unknown]);

        return $"aura-2-{names[Math.Abs(order) % names.Length]}-en";
    }
}
