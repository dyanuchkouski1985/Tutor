using Api.Ai;
using Api.Enums;

namespace Api.Speech;

public static class VoiceResolver
{
    private static readonly ParticipantVoice[] fallbackVoices =
    [
        ParticipantVoice.Woman,
        ParticipantVoice.ElderlyMan,
        ParticipantVoice.Girl,
        ParticipantVoice.Man
    ];

    public static Dictionary<string, ParticipantVoice> Resolve(
        IReadOnlyList<(string Name, ParticipantGender Gender)> participants,
        List<AiParticipantVoice> assigned)
    {
        var result = new Dictionary<string, ParticipantVoice>(StringComparer.OrdinalIgnoreCase);

        for (var index = 0; index < participants.Count; index++)
        {
            var name = participants[index].Name.Trim();

            var match = (assigned ?? []).FirstOrDefault(voice =>
                string.Equals(voice.Name, name, StringComparison.OrdinalIgnoreCase));

            var voice = Enum.TryParse<ParticipantVoice>(match?.Voice, true, out var parsed)
                        && parsed != ParticipantVoice.Unknown
                ? parsed
                : fallbackVoices[index % fallbackVoices.Length];

            result[name] = ApplyGender(voice, participants[index].Gender);
        }

        return result;
    }

    private static ParticipantVoice ApplyGender(ParticipantVoice voice, ParticipantGender gender) =>
        gender switch
        {
            ParticipantGender.Male => voice switch
            {
                ParticipantVoice.Girl => ParticipantVoice.Boy,
                ParticipantVoice.Woman => ParticipantVoice.Man,
                ParticipantVoice.ElderlyWoman => ParticipantVoice.ElderlyMan,
                _ => voice
            },
            ParticipantGender.Female => voice switch
            {
                ParticipantVoice.Boy => ParticipantVoice.Girl,
                ParticipantVoice.Man => ParticipantVoice.Woman,
                ParticipantVoice.ElderlyMan => ParticipantVoice.ElderlyWoman,
                _ => voice
            },
            _ => voice
        };
}
