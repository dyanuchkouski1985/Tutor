import { DirectionEnum } from '../enums/direction.enum';
import { WordLearningProgressEnum } from '../enums/word-learning-progress.enum';

export class CrosswordModel {
  horizontalWords: CrosswordWordModel[] = [];
  verticalWords: CrosswordWordModel[] = [];
  board: CrosswordBoardCell[][] = [];

  constructor(
    horizontalWords: CrosswordWordModel[],
    verticalWords: CrosswordWordModel[],
    board: CrosswordBoardCell[],
  ) {
    this.horizontalWords = horizontalWords;
    this.verticalWords = verticalWords;
    this.board = this.board;
  }
}

export type CrosswordWordStatus = 'correct' | 'wrong';

export class CrosswordWordModel {
  startY: number;
  startX: number;
  wordId: number;
  wordLearningProgress: WordLearningProgressEnum;
  value: string;
  answer: string;
  translations: string[];
  pictureIds: number[];
  usages: string[];
  isAnyNewPictureAvailable = false;
  status?: CrosswordWordStatus;

  constructor(
    startY: number,
    startX: number,
    wordId: number,
    wordLearningProgress: WordLearningProgressEnum,
    value: string,
    answer: string,
    translations: string[],
    pictureIds: number[],
    usages: string[],
  ) {
    this.startY = startY;
    this.startX = startX;
    this.wordId = wordId;
    this.wordLearningProgress = wordLearningProgress;
    this.value = value;
    this.answer = answer;
    this.translations = translations;
    this.pictureIds = pictureIds;
    this.usages = usages;
  }
}

export class CrosswordBoardCell {
  direction: DirectionEnum;
  value: string;
  verticalWordId: number;
  horizontalWordId: number;
  answer: string;
  isLocked?: boolean;
  isRevealed?: boolean;

  constructor(
    direction: DirectionEnum,
    value: string,
    verticalWordId: number,
    horizontalWordId: number,
    answer: string,
  ) {
    this.direction = direction;
    this.value = value;
    this.verticalWordId = verticalWordId;
    this.horizontalWordId = horizontalWordId;
    this.answer = answer;
  }
}
