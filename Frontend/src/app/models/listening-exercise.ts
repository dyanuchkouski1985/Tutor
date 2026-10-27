import { ConversationParticipant } from './conversation';

export interface ListeningLine {
  participantId: number;
  text: string;
  translation: string | null;
}

export interface ListeningQuestion {
  text: string;
  options: string[];
}

export interface ListeningExercise {
  situation: string | null;
  participants: ConversationParticipant[];
  lines: ListeningLine[];
  questions: ListeningQuestion[];
  key: string | null;
  error: string | null;
}

export interface ListeningAnswer {
  isCorrect: boolean;
  correctOption: number;
  points: number;
  error: string | null;
}
