import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ApiService } from '../../services/api.service';
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
import { ExerciseResultComponent } from '../exercise-result/exercise-result';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-crossword-exercise',
  imports: [
    FormsModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    RippleModule,
    StarComponent,
    ExerciseResultComponent
],
  templateUrl: './crossword-exercise.html',
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
  @ViewChildren('cell') cells?: QueryList<ElementRef>;
  private direction: DirectionEnum | null = null;
  private isCellFocusedAutomatically = false;
  private arrowKeyDownHorizontalPosition: number | null = null;
  private finishSound: HTMLAudioElement = new Audio();
  private successSound: HTMLAudioElement = new Audio();

  constructor(
    private readonly apiService: ApiService,
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
    this.isBusy = true;
    this.apiService
      .getCrosswordExercise()
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (data) => {
          this.crosswordModel = data;
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
              prevCell.answer = '';
              prevCellRef.nativeElement.focus();
            }
          } else if (this.direction == DirectionEnum.Horizontal && x > 0) {
            const prevCellRef = this.cells.get(this.crosswordModel.board.length * y + x - 1);
            const prevCell = this.crosswordModel.board[y][x - 1];
            if (prevCellRef && prevCell) {
              this.isCellFocusedAutomatically = true;
              prevCell.answer = '';
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
    this.isCompleted = true;

    if (this.crosswordModel) {
      for (const word of this.crosswordModel.verticalWords) {
        word.answer = '';
        let y = word.startY;
        do {
          const cell = this.crosswordModel.board[y][word.startX];
          if (!cell || !cell.answer) {
            break;
          }
          word.answer += cell.answer;
          y++;
        } while (y < this.crosswordModel.board.length);
      }

      for (const word of this.crosswordModel.horizontalWords) {
        word.answer = '';
        let x = word.startX;
        do {
          const cell = this.crosswordModel.board[word.startY][x];
          if (!cell || !cell.answer) {
            break;
          }
          word.answer += cell.answer;
          x++;
        } while (x < this.crosswordModel.board[0].length);
      }

      const result: ExerciseWordResult[] = [];
      const words = this.crosswordModel.horizontalWords.concat(this.crosswordModel.verticalWords);
      for (const word of words) {
        result.push(new ExerciseWordResult(word.wordId, word.value === word.answer));
      }

      this.apiService
        .putExerciseResults(result)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.userStatisticsService.refresh();
          },
          error: (error) => {
            console.log(error);
          },
        });

      result.filter((r) => !r.isCorrectAnswer).length == 0
        ? this.soundService.success()
        : this.soundService.finish();
    }
  }

  onShowResult() {
    this.showResult = true;
    if (!this.crosswordModel) {
      return;
    }

    const words = this.crosswordModel.horizontalWords.concat(this.crosswordModel.verticalWords);
    for (const word of words) {
      const isCorrectAnswer = word.value === word.answer;
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
