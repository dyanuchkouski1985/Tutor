export class UserStatistics {
  email: string;
  dailyPercentage: number;
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
}
