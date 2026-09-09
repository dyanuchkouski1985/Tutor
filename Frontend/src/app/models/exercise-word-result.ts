export class ExerciseWordResult {
  wordId: number;
  isCorrectAnswer: boolean;
  withHelp: boolean;

  constructor(wordId: number, isCorrectAnswer: boolean, withHelp = false) {
    this.wordId = wordId;
    this.isCorrectAnswer = isCorrectAnswer;
    this.withHelp = withHelp;
  }
}
