export class SentenceTranslationExercise {
  tasks: SentenceTranslationTask[] = [];
  error: string;
}

export class SentenceTranslationTask {
  sentence: string;
  translation: string;
  hints: SentenceTranslationHint[] = [];
}

export class SentenceTranslationHint {
  fragment: string;
  translation: string;
}

export class SentenceTranslationSegment {
  text: string;
  hint: SentenceTranslationHint | null;
}

export class SentenceTranslationAnswer {
  isCorrect: boolean;
  naturalTranslation: string;
  explanation: string;
  points: number;
  error: string;
}

export class SentenceTranslationResult {
  sentence: string;
  answer: string;
  naturalTranslation: string;
  points: number;
  isCorrect: boolean;
}
