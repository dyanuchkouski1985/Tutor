export interface VerbFormsTask {
  verb: string;
  sentence: string;
}

export interface VerbFormsExercise {
  tasks: VerbFormsTask[];
  key: string | null;
  error: string | null;
}

export interface VerbFormsAnswer {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
  forms: string[];
  points: number;
  error: string | null;
}
