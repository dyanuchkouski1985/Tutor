import { ParticipantGenderEnum } from '../enums/participant-gender.enum';
import { ParticipantVoiceEnum } from '../enums/participant-voice.enum';

export class VoiceProfile {
  gender: ParticipantGenderEnum;
  pitch: number;
  rate: number;
}

export class VoiceConstants {
  public static VOICES_READY_TIMEOUT = 1000;
  public static MIN_PITCH = 0.6;
  public static MAX_PITCH = 1.6;
  public static MIN_RATE = 0.7;
  public static MAX_RATE = 1.25;
  public static QUALITY_MARKERS = ['natural', 'neural', 'online'];
  public static ORDER_PITCH_OFFSETS = [0, 0.2, -0.16, 0.34];
  public static ORDER_RATE_OFFSETS = [0, -0.07, 0.07, -0.13];

  public static MALE_NAMES = ['adam', 'david', 'mark', 'marek', 'ryan'];

  public static FEMALE_NAMES = ['paulina', 'zira', 'agnieszka', 'sonia', 'zofia'];

  public static PROFILES: Record<number, VoiceProfile> = {
    [ParticipantVoiceEnum.Unknown]: {
      gender: ParticipantGenderEnum.Unspecified,
      pitch: 1,
      rate: 1,
    },
    [ParticipantVoiceEnum.Boy]: { gender: ParticipantGenderEnum.Male, pitch: 1.3, rate: 1.08 },
    [ParticipantVoiceEnum.Man]: { gender: ParticipantGenderEnum.Male, pitch: 0.95, rate: 1 },
    [ParticipantVoiceEnum.ElderlyMan]: {
      gender: ParticipantGenderEnum.Male,
      pitch: 0.75,
      rate: 0.85,
    },
    [ParticipantVoiceEnum.Girl]: { gender: ParticipantGenderEnum.Female, pitch: 1.4, rate: 1.08 },
    [ParticipantVoiceEnum.Woman]: { gender: ParticipantGenderEnum.Female, pitch: 1.05, rate: 1 },
    [ParticipantVoiceEnum.ElderlyWoman]: {
      gender: ParticipantGenderEnum.Female,
      pitch: 0.9,
      rate: 0.85,
    },
  };
}
