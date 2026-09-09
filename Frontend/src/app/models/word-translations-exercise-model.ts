export class WordTranslationsExerciseModel {
  wordId: number;
  word: string;
  wordLearningProgress: number;
  translations: string[];
  pictureIds: number[];
  usages: string[];
  isAnyNewPictureAvailable: boolean;
  reverted = false; // When reverted === true, then word will be shown as question instead of translations.
}
