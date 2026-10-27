import { WordLearningProgressEnum } from '../enums/word-learning-progress.enum';

export interface ExplainTask {
  wordId: number;
  word: string;
  translations: string[];
  usages: string[];
  exampleExplanation: string | null;
}

export interface ExplainExercise {
  tasks: ExplainTask[];
}

export interface ExplainAttempt {
  explanation: string;
  guess: string;
}

export interface ExplainGuess {
  isValid: boolean;
  reason: string | null;
  guess: string | null;
  isCorrect: boolean;
  isFinished: boolean;
  points: number;
  wordLearningProgress: WordLearningProgressEnum;
  error: string | null;
}

export interface ExplainResult {
  word: string;
  isCorrect: boolean;
  points: number;
  attemptsCount: number;
}
