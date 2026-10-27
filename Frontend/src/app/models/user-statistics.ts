export type ExerciseAvailabilityFlag =
  | 'isAvailableRepeatPausedWordsExercise'
  | 'isAvailableTranslationsWordExercise'
  | 'isAvailableCrosswordExercise'
  | 'isAvailableGuessExercise'
  | 'isAvailableExplainExercise'
  | 'isAvailableListeningExercise'
  | 'isAvailableCountabilityExercise'
  | 'isAvailableVerbFormsExercise'
  | 'isAvailableArticlesExercise'
  | 'isAvailableTomorrowWords';

export class UserStatistics {
  email: string;
  dailyPercentage: number;
  conversationPercentage: number;
  conversationMaxDailyPoints: number;
  countabilityPercentage: number;
  countabilityMaxDailyPoints: number;
  verbFormsPercentage: number;
  verbFormsMaxDailyPoints: number;
  articlesPercentage: number;
  articlesMaxDailyPoints: number;
  totalNumberOfWords: number;
  totalNumberOfCompletedWords: number;
  totalNumberOfPausedWords: number;
  totalNumberOfWordsWithProgress3: number;
  totalNumberOfWordsWithProgress2: number;
  totalNumberOfWordsWithProgress1: number;
  totalNumberOfWordsWithProgress0: number;
  lastDaysPercentages: number[];
  availableRepeatPausedWordsCount: number;
  isAvailableRepeatPausedWordsExercise: boolean;
  isAvailableTranslationsWordExercise: boolean;
  isAvailableCrosswordExercise: boolean;
  isAvailableGuessExercise: boolean;
  isAvailableExplainExercise: boolean;
  isAvailableListeningExercise: boolean;
  isAvailableCountabilityExercise: boolean;
  isAvailableVerbFormsExercise: boolean;
  isAvailableArticlesExercise: boolean;
  isAvailableTomorrowWords: boolean;
}
