import { MistakeProgressEnum } from '../enums/mistake-progress.enum';

export class MistakePattern {
  id: number;
  category: string;
  rule: string;
  progress: MistakeProgressEnum;
  occurrencesCount: number;
  lastOccurrenceDate: Date;
  createdDate: Date;
  lastPracticeDate: Date | null;
  isPractisedToday: boolean;
  examples: MistakeOccurrence[] = [];
}

export class MistakeOccurrence {
  fragment: string;
  correction: string;
  explanation: string;
  createdDate: Date;
}

export class MistakesExercise {
  tasks: MistakeTask[] = [];
  error: string;
}

export class MistakeTask {
  patternId: number;
  category: string;
  rule: string;
  progress: MistakeProgressEnum;
  sentence: string;
  fragment: string;
  correctedSentence: string;
  explanation: string;
  example: MistakeOccurrence;
}

export class MistakeAnswer {
  isCorrect: boolean;
  correctedSentence: string;
  explanation: string;
  progress: MistakeProgressEnum;
  isCounted: boolean;
  points: number;
  error: string;
}

export class MistakeTaskResult {
  sentence: string;
  fragment: string;
  answer: string;
  correctedSentence: string;
  points: number;
  isCorrect: boolean;
}

export class MistakeStatusGroup {
  title: string;
  patterns: MistakePattern[] = [];
}
