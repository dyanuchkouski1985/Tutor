import { ExerciseTypeEnum } from '../enums/exercise-type.enum';

export interface ExerciseCompletionSummary {
  exercise: ExerciseTypeEnum;
  days: number;
  percentage: number;
}
