import { ExerciseTypeEnum } from '../enums/exercise-type.enum';
import { UserStatistics } from './user-statistics';

export interface GapChoiceTask {
  noun: string;
  sentence: string;
  options: string[];
}

export interface GapChoiceExercise {
  tasks: GapChoiceTask[];
  key: string | null;
  error: string | null;
}

export interface GapChoiceAnswer {
  isCorrect: boolean;
  correctOption: number;
  explanation: string | null;
  points: number;
  error: string | null;
}

export interface GapChoiceExerciseConfig {
  apiName: string;
  exercise: ExerciseTypeEnum;
  unavailableMessage: string;
  noWordLabel?: string;
  dailyPoints: (statistics: UserStatistics) => number;
  dailyLimit: (statistics: UserStatistics) => number;
  isAvailable: (statistics: UserStatistics) => boolean;
}
