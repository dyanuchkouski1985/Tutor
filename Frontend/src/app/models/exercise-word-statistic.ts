export class ExerciseWordStatistic {
  wordId: number;
  word: string;
  translations: string[];
  pictureIds: number[];
  usages: string[];
  isAnyNewPictureAvailable: boolean;
  answer: string;
  isCorrectAnswer: boolean;
  wordLearningProgress: number;
  withHelp: boolean;
  reverted: boolean;

  constructor(
    wordId: number,
    word: string,
    translations: string[],
    pictureIds: number[],
    usages: string[],
    isAnyNewPictureAvailable: boolean,
    answer: string,
    isCorrectAnswer: boolean,
    wordLearningProgress: number,
    withHelp: boolean,
    reverted = false,
  ) {
    this.wordId = wordId;
    this.word = word;
    this.translations = translations;
    this.pictureIds = pictureIds;
    this.usages = usages;
    this.answer = answer;
    this.isAnyNewPictureAvailable = isAnyNewPictureAvailable;
    this.isCorrectAnswer = isCorrectAnswer;
    this.wordLearningProgress = wordLearningProgress;
    this.withHelp = withHelp;
    this.reverted = reverted;
  }
}
