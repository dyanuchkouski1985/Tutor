import { WordLearningProgressEnum } from '../enums/word-learning-progress.enum';

export interface GuessTask {
  wordId: number;
  description: string;
  example: string | null;
  letters: string[];
}

export interface GuessExercise {
  tasks: GuessTask[];
  error: string | null;
}

export interface GuessAnswer {
  isCorrect: boolean;
  word: string;
  translations: string[];
  usages: string[];
  wordLearningProgress: WordLearningProgressEnum;
  points: number;
  error: string | null;
}

export interface GuessResult {
  word: string;
  answer: string;
  isCorrect: boolean;
  points: number;
}
