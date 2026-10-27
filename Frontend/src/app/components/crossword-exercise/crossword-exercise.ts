import {
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ExerciseCompletionsService } from '../../services/exercise-completions.service';
import { ExerciseTypeEnum } from '../../enums/exercise-type.enum';
import { finalize, take } from 'rxjs/operators';
import {
  CrosswordBoardCell,
  CrosswordModel,
  CrosswordWordModel,
} from '../../models/crossword-model';
import { DirectionEnum } from '../../enums/direction.enum';
import { ExerciseWordStatistic } from '../../models/exercise-word-statistic';
import { ExerciseWordResult } from '../../models/exercise-word-result';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { SoundService } from '../../services/sound.service';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';

import { StarComponent } from '../star/star';
import { FormsModule } from '@angular/forms';
import { SvgIconComponent } from 'angular-svg-icon';
import { TooltipDirective } from '../../ui/tooltip';
import { ExerciseResultComponent } from '../exercise-result/exercise-result';
import { ExerciseUnavailableComponent } from '../exercise-unavailable/exercise-unavailable';

@Component({
  selector: 'app-crossword-exercise',
  imports: [
    FormsModule,
    SvgIconComponent,
    TooltipDirective,
    StarComponent,
    ExerciseResultComponent,
    ExerciseUnavailableComponent,
  ],
  templateUrl: './crossword-exercise.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./crossword-exercise.scss'],
})
export class CrosswordExerciseComponent implements OnInit {
  crosswordModel: CrosswordModel | null = null;
  activeWordId: number | null = null;
  activeY: number | null = null;
  activeX: number | null = null;
  isCompleted = false;
  showResult = false;
  exerciseWordStatistics: ExerciseWordStatistic[] = [];
  isBusy = false;
  isUnavailable = false;
  @ViewChildren('cell') cells?: QueryList<ElementRef>;
  private direction: DirectionEnum | null = null;
  private isCellFocusedAutomatically = false;
  private arrowKeyDownHorizontalPosition: number | null = null;
  private finishSound: HTMLAudioElement = new Audio();

  constructor(
    private readonly apiService: ApiService,
    private readonly exerciseCompletionsService: ExerciseCompletionsService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly soundService: SoundService,
  ) {}

  ngOnInit() {
    this.startExercise();
  }

  private startExercise() {
    this.crosswordModel = null;
    this.activeWordId = null;
    this.activeY = null;
    this.activeX = null;
    this.isCompleted = false;
    this.showResult = false;
    this.exerciseWordStatistics = [];
    this.isCellFocusedAutomatically = false;
    this.arrowKeyDownHorizontalPosition = null;
    this.isUnavailable = false;
    this.isBusy = true;
    this.apiService
      .getCrosswordExercise()
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (data) => {
          this.isUnavailable = !data.horizontalWords.length && !data.verticalWords.length;
          this.crosswordModel = this.isUnavailable ? null : data;
        },
        error: (error) => {
          console.log(error);
        },
      });
  }

  onQuestionClick(word: CrosswordWordModel, isHorizontal: boolean) {
    if (this.isCompleted) {
      return;
    }

    if (this.crosswordModel && this.crosswordModel.board && this.cells) {
      const index = this.crosswordModel.board.length * word.startY + word.startX;
      const cell = this.cells.get(index);
      if (cell) {
        this.direction = isHorizontal ? DirectionEnum.Horizontal : DirectionEnum.Vertical;
        this.isCellFocusedAutomatically = true;
        this.setActiveWordId(word.startY, word.startX);
        cell.nativeElement.focus();
        cell.nativeElement.setSelectionRange(0, 0);
      }
    }
  }

  onCellFocus($event: FocusEvent, cell: CrosswordBoardCell, y: number, x: number) {
    if (!this.cells || !this.crosswordModel) {
      return;
    }

    this.activeY = y;
    this.activeX = x;

    if (this.isCellFocusedAutomatically) {
      this.isCellFocusedAutomatically = false;
      return;
    }

    let nextVerticalCell = null;
    let prevVerticalCell = null;
    if (y < this.crosswordModel.board.length - 1) {
      nextVerticalCell = this.crosswordModel.board[y + 1][x];
    }
    if (y > 0) {
      prevVerticalCell = this.crosswordModel.board[y - 1][x];
    }

    let nextHorizontalCell = null;
    let prevHorizontalCell = null;
    if (x < this.crosswordModel.board[0].length - 1) {
      nextHorizontalCell = this.crosswordModel.board[y][x + 1];
    }
    if (x > 0) {
      prevHorizontalCell = this.crosswordModel.board[y][x - 1];
    }

    if (
      ((nextVerticalCell || prevVerticalCell) && !nextHorizontalCell) ||
      (nextVerticalCell && !prevVerticalCell && prevHorizontalCell)
    ) {
      this.direction = DirectionEnum.Vertical;
    } else if (
      ((nextHorizontalCell || prevHorizontalCell) && !nextVerticalCell) ||
      (nextHorizontalCell && !prevHorizontalCell && prevVerticalCell)
    ) {
      this.direction = DirectionEnum.Horizontal;
    } else {
      this.direction = null;
    }

    if (this.direction == null) {
      this.activeWordId = null;
    } else {
      this.setActiveWordId(y, x);
    }
  }

  onKeyDown($event: KeyboardEvent, y: number, x: number) {
    if (this.cells && this.crosswordModel) {
      const currentCell = this.cells.get(this.crosswordModel.board.length * y + x);
      const selectionStart = currentCell?.nativeElement.selectionStart;
      switch ($event.key) {
        case 'ArrowLeft': {
          this.arrowKeyDownHorizontalPosition = currentCell?.nativeElement.selectionEnd;
          break;
        }
        case 'ArrowRight': {
          this.arrowKeyDownHorizontalPosition = selectionStart;
          break;
        }
        case 'Backspace': {
          if (selectionStart > 0) {
            break;
          } else if (this.direction == DirectionEnum.Vertical && y > 0) {
            const prevCellRef = this.cells.get(this.crosswordModel.board.length * (y - 1) + x);
            const prevCell = this.crosswordModel.board[y - 1][x];
            if (prevCellRef && prevCell) {
              this.isCellFocusedAutomatically = true;
              if (!prevCell.isLocked) {
                prevCell.answer = '';
              }
              prevCellRef.nativeElement.focus();
            }
          } else if (this.direction == DirectionEnum.Horizontal && x > 0) {
            const prevCellRef = this.cells.get(this.crosswordModel.board.length * y + x - 1);
            const prevCell = this.crosswordModel.board[y][x - 1];
            if (prevCellRef && prevCell) {
              this.isCellFocusedAutomatically = true;
              if (!prevCell.isLocked) {
                prevCell.answer = '';
              }
              prevCellRef.nativeElement.focus();
            }
          }
          break;
        }
      }
    }
  }

  onKeyUp($event: KeyboardEvent, cell: CrosswordBoardCell, y: number, x: number) {
    if (!this.crosswordModel || !this.crosswordModel.board || !this.cells) {
      return;
    }

    if ($event.key.length == 1) {
      const cellRef = this.cells.get(this.crosswordModel.board.length * y + x);
      if (
        cellRef &&
        !cell.isLocked &&
        cellRef.nativeElement.selectionStart == 0 &&
        cellRef.nativeElement.selectionEnd == 0
      ) {
        cell.answer = $event.key;
      }
    } else {
      switch ($event.key) {
        case 'ArrowLeft': {
          if (x === 0) {
            this.arrowKeyDownHorizontalPosition = null;
            break;
          }

          const currentCell = this.cells.get(this.crosswordModel.board.length * y + x);
          const nextCell = this.cells.get(this.crosswordModel.board.length * y + x - 1);
          const nextBoardCell = this.crosswordModel.board[y][x - 1];
          if (
            nextCell &&
            currentCell &&
            cell &&
            nextBoardCell &&
            (!cell.answer || this.arrowKeyDownHorizontalPosition === 0)
          ) {
            if (this.direction == DirectionEnum.Horizontal) {
              this.isCellFocusedAutomatically = true;
            }
            nextCell.nativeElement.focus();
            nextCell.nativeElement.setSelectionRange(0, 0);
          }

          this.arrowKeyDownHorizontalPosition = null;
          break;
        }
        case 'ArrowRight': {
          if (x === this.crosswordModel.board[0].length - 1) {
            this.arrowKeyDownHorizontalPosition = null;
            break;
          }

          const currentCell = this.cells.get(this.crosswordModel.board.length * y + x);
          const nextCell = this.cells.get(this.crosswordModel.board.length * y + x + 1);
          const nextBoardCell = this.crosswordModel.board[y][x + 1];
          if (
            nextCell &&
            currentCell &&
            cell &&
            nextBoardCell &&
            (!cell.answer || this.arrowKeyDownHorizontalPosition === 1)
          ) {
            if (this.direction == DirectionEnum.Horizontal) {
              this.isCellFocusedAutomatically = true;
            }
            nextCell.nativeElement.focus();
            nextCell.nativeElement.setSelectionRange(0, 0);
          }

          this.arrowKeyDownHorizontalPosition = null;
          break;
        }
        case 'ArrowUp': {
          if (y === 0) {
            break;
          }

          const currentCell = this.cells.get(this.crosswordModel.board.length * y + x);
          const nextCell = this.cells.get(this.crosswordModel.board.length * (y - 1) + x);
          const nextBoardCell = this.crosswordModel.board[y - 1][x];
          if (nextCell && currentCell && cell && nextBoardCell) {
            if (this.direction == DirectionEnum.Vertical) {
              this.isCellFocusedAutomatically = true;
            }
            nextCell.nativeElement.focus();
            nextCell.nativeElement.setSelectionRange(0, 0);
          }

          break;
        }
        case 'ArrowDown': {
          if (y === this.crosswordModel.board.length - 1) {
            break;
          }

          const currentCell = this.cells.get(this.crosswordModel.board.length * y + x);
          const nextCell = this.cells.get(this.crosswordModel.board.length * (y + 1) + x);
          const nextBoardCell = this.crosswordModel.board[y + 1][x];
          if (nextCell && currentCell && cell && nextBoardCell) {
            if (this.direction == DirectionEnum.Vertical) {
              this.isCellFocusedAutomatically = true;
            }
            nextCell.nativeElement.focus();
            nextCell.nativeElement.setSelectionRange(0, 0);
          }

          this.arrowKeyDownHorizontalPosition = null;
          break;
        }
      }

      return;
    }

    if (this.direction == DirectionEnum.Vertical) {
      if (y < this.crosswordModel.board.length - 1) {
        const index = this.crosswordModel.board.length * (y + 1) + x;
        const cell = this.cells.get(index);
        if (cell && this.crosswordModel.board[y + 1][x]) {
          this.isCellFocusedAutomatically = true;
          cell.nativeElement.focus();
          cell.nativeElement.setSelectionRange(0, 0);
        }
      }
      return;
    }

    if (this.direction == DirectionEnum.Horizontal) {
      if (x < this.crosswordModel.board[0].length - 1) {
        const index = this.crosswordModel.board.length * y + x + 1;
        const cell = this.cells.get(index);
        if (cell && this.crosswordModel.board[y][x + 1]) {
          this.isCellFocusedAutomatically = true;
          cell.nativeElement.focus();
          cell.nativeElement.setSelectionRange(0, 0);
        }
      }
      return;
    }
  }

  onComplete() {
    if (!this.crosswordModel || this.isCompleted) {
      return;
    }

    const openWords = this.allWords.filter((word) => !word.status);

    for (const word of openWords) {
      word.answer = '';
      for (const { cell } of this.getWordCells(word)) {
        if (!cell.answer) {
          break;
        }
        word.answer += cell.answer;
      }
      word.status = this.isWordCorrect(word) ? 'correct' : 'wrong';
    }

    this.saveResults(openWords);
    this.finishExercise();
  }

  get checkIcon() {
    const word = this.checkableWord;
    const board = this.crosswordModel?.board;

    if (!word || !board || !this.cells) {
      return null;
    }

    const target = this.getCheckCell(word);
    const input: HTMLElement | undefined = target
      ? this.cells.get(board.length * target.y + target.x)?.nativeElement
      : undefined;

    return input
      ? {
          top: input.offsetTop,
          left: input.offsetLeft,
          width: input.offsetWidth,
          height: input.offsetHeight,
        }
      : null;
  }

  onCheckWord() {
    const word = this.checkableWord;

    if (word) {
      this.settleWord(word);
    }
  }

  onCellChange(cell: CrosswordBoardCell, y: number, x: number, value: string) {
    if (cell.isLocked) {
      return;
    }
    cell.answer = value;
  }

  private get allWords() {
    return this.crosswordModel
      ? this.crosswordModel.horizontalWords.concat(this.crosswordModel.verticalWords)
      : [];
  }

  private getWordCells(word: CrosswordWordModel) {
    const isHorizontal = !!this.crosswordModel?.horizontalWords.includes(word);

    return [...word.value].map((_, index) => {
      const y = isHorizontal ? word.startY : word.startY + index;
      const x = isHorizontal ? word.startX + index : word.startX;

      return { cell: this.crosswordModel!.board[y][x], y, x };
    });
  }

  private get checkableWord() {
    if (this.isCompleted || this.activeWordId === null) {
      return null;
    }

    const word = this.allWords.find((item) => item.wordId === this.activeWordId);

    return word && !word.status && this.getWordCells(word).every(({ cell }) => !!cell.answer)
      ? word
      : null;
  }

  private getCheckCell(word: CrosswordWordModel) {
    const board = this.crosswordModel!.board;
    const isHorizontal = this.crosswordModel!.horizontalWords.includes(word);
    const length = word.value.length;
    const after = isHorizontal
      ? { y: word.startY, x: word.startX + length }
      : { y: word.startY + length, x: word.startX };
    const before = isHorizontal
      ? { y: word.startY, x: word.startX - 1 }
      : { y: word.startY - 1, x: word.startX };
    const isInBoard = (point: { y: number; x: number }) =>
      point.y >= 0 && point.x >= 0 && point.y < board.length && point.x < board[0].length;
    const isFree = (point: { y: number; x: number }) =>
      isInBoard(point) && !board[point.y][point.x];

    return [after, before].find(isFree) ?? [after, before].find(isInBoard) ?? null;
  }

  private settleWord(word: CrosswordWordModel) {
    const cells = this.getWordCells(word);

    word.answer = cells.map(({ cell }) => cell.answer).join('');
    word.status = this.isWordCorrect(word) ? 'correct' : 'wrong';

    cells.forEach(({ cell }, index) => {
      if (!this.isSame(cell.answer, word.value[index])) {
        cell.answer = word.value[index];
        cell.isRevealed = true;
      }
      cell.isLocked = true;
    });

    this.saveResults([word]);

    if (this.allWords.every((item) => item.status)) {
      this.finishExercise();
      return;
    }

    word.status === 'correct' ? this.soundService.correct() : this.soundService.error();
  }

  private saveResults(words: CrosswordWordModel[]) {
    if (!words.length) {
      return;
    }

    this.apiService
      .putExerciseResults(
        words.map((word) => new ExerciseWordResult(word.wordId, word.status === 'correct')),
      )
      .pipe(take(1))
      .subscribe({
        next: () => this.userStatisticsService.refresh(),
        error: (error) => console.log(error),
      });
  }

  private finishExercise() {
    if (this.isCompleted) {
      return;
    }

    this.isCompleted = true;
    this.activeWordId = null;
    this.exerciseCompletionsService.markCompleted(ExerciseTypeEnum.Crossword);
    this.allWords.every((word) => word.status === 'correct')
      ? this.soundService.celebrate()
      : this.soundService.finish();
  }

  onShowResult() {
    this.showResult = true;
    if (!this.crosswordModel) {
      return;
    }

    const words = this.crosswordModel.horizontalWords.concat(this.crosswordModel.verticalWords);
    for (const word of words) {
      const isCorrectAnswer = this.isWordCorrect(word);
      let newWordLearningProgress = word.wordLearningProgress;
      if (isCorrectAnswer && newWordLearningProgress < WordLearningProgressEnum.Three) {
        newWordLearningProgress++;
      }
      if (!isCorrectAnswer && newWordLearningProgress > WordLearningProgressEnum.None) {
        newWordLearningProgress--;
      }

      newWordLearningProgress = Math.min(newWordLearningProgress, WordLearningProgressEnum.Three);
      this.exerciseWordStatistics.push(
        new ExerciseWordStatistic(
          word.wordId,
          word.value,
          word.translations,
          word.pictureIds,
          word.usages,
          word.isAnyNewPictureAvailable,
          word.answer,
          isCorrectAnswer,
          newWordLearningProgress,
          false,
        ),
      );
    }
  }

  onRepeat() {
    this.startExercise();
  }

  isWordCorrect(word: CrosswordWordModel) {
    return this.isSame(word.answer, word.value);
  }

  isSame(answer: string | null | undefined, value: string) {
    return (answer ?? '').toLocaleLowerCase() === value.toLocaleLowerCase();
  }

  private setActiveWordId(y: number, x: number) {
    if (!this.crosswordModel) {
      return;
    }

    const boardCell = this.crosswordModel.board[y][x];
    if (boardCell) {
      if (this.direction == DirectionEnum.Horizontal) {
        this.activeWordId = boardCell.horizontalWordId;
      } else if (this.direction == DirectionEnum.Vertical) {
        this.activeWordId = boardCell.verticalWordId;
      }
    }
  }
}
