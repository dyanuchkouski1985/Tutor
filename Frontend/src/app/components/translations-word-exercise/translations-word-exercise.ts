import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { StaticConfigService } from '../../services/static.config.service';
import { DynamicConfigService } from '../../services/dynamic.config.service';
import { ApiService } from '../../services/api.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { SoundService } from '../../services/sound.service';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';
import { WordTranslationsExerciseModel } from '../../models/word-translations-exercise-model';
import { ExerciseWordResult } from '../../models/exercise-word-result';
import { ExerciseWordStatistic } from '../../models/exercise-word-statistic';
import { CommonModule } from '@angular/common';
import { StarComponent } from '../star/star';
import { RoundprogressModule } from 'angular-svg-round-progressbar';
import { ImageModule } from 'primeng/image';
import { SvgIconComponent } from 'angular-svg-icon';
import { ExerciseResultComponent } from '../exercise-result/exercise-result';
import { ProgressBarModule } from 'primeng/progressbar';
import { FormsModule } from '@angular/forms';
import { AutoFocusModule } from 'primeng/autofocus';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { finalize, take } from 'rxjs/operators';

class NextOptions {
  doNotKnow: boolean = false;

  constructor(doNotKnow: boolean) {
    this.doNotKnow = doNotKnow;
  }
}

class AnswerLetter {
  Value = '';
  Enabled = true;
  UsedInCell: number | null = null; // index of the cell using this letter

  constructor(value: string) {
    this.Value = value;
  }
}

@Component({
  selector: 'app-translations-word-exercise',
  imports: [
    CommonModule,
    FormsModule,
    RoundprogressModule,
    ImageModule,
    ProgressBarModule,
    AutoFocusModule,
    InputTextModule,
    ButtonModule,
    RippleModule,
    StarComponent,
    SvgIconComponent,
    ExerciseResultComponent,
  ],
  templateUrl: './translations-word-exercise.html',
  styleUrls: ['./translations-word-exercise.scss'],
})
export class TranslationsWordExerciseComponent implements OnInit, OnDestroy {
  tasks: WordTranslationsExerciseModel[] = [];
  exerciseWordStatistics: ExerciseWordStatistic[] = [];
  answer = '';
  questionIndex = 0;
  formattedAnswer = '';
  showAnswer = false;
  isHelpMode = false;
  helpModeAnswer: string[] = [];
  helpModeAnswerLetters: AnswerLetter[] = [];
  isCorrectAnswer = false;
  answersHistory: boolean[] = [];
  helpHistory: boolean[] = [];
  remainingTime: number = this.staticConfigService.timerValueInSeconds;
  isBusy = false;
  private timerSubscription: Subscription | null = null;

  @ViewChild('submitButton') submitButtonRef?: ElementRef;
  @ViewChildren('helpModeAnswerCell') helpModeAnswerCells?: QueryList<ElementRef>;

  constructor(
    public readonly staticConfigService: StaticConfigService,
    public readonly dynamicConfigService: DynamicConfigService,
    private readonly apiService: ApiService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly soundService: SoundService,
  ) {}

  get isSubmitDisabled(): boolean {
    return (
      !this.showAnswer &&
      ((!this.isHelpMode && !this.answer?.length) ||
        (this.isHelpMode && this.helpModeAnswer.some((c) => !c.length)))
    );
  }

  ngOnInit() {
    this.startExercise();
  }

  ngOnDestroy() {
    this.unsubscribeTimer();
  }

  onNext(options: NextOptions | null = null) {
    options = options || new NextOptions(false);
    if (this.showAnswer) {
      this.answer = '';
      this.isHelpMode = false;
      this.helpModeAnswer = [];
      this.helpModeAnswerLetters = [];
      if (this.staticConfigService.enableTimer && this.questionIndex < this.tasks.length) {
        this.timerSubscription = timer(0, 1000).subscribe(this.onTimer.bind(this));
      }
      if (this.questionIndex == this.tasks.length) {
        this.exerciseWordStatistics.filter((ews) => !ews.isCorrectAnswer).length == 0
          ? this.soundService.success()
          : this.soundService.finish();
      }
    } else {
      this.answer = this.isHelpMode ? this.helpModeAnswer.join('') : this.answer.trim();
      if (options.doNotKnow) {
        this.answer = '';
      } else if (
        this.answer == '' &&
        (!this.staticConfigService.enableTimer || this.remainingTime != 0)
      ) {
        return;
      }

      if (this.staticConfigService.enableTimer) {
        this.soundService.clockTickingReset();
        this.unsubscribeTimer();
      }

      const task = this.tasks[this.questionIndex];

      const wordPronunciationAudio = new Audio();
      wordPronunciationAudio.src = this.apiService.getWordPronunciationUrl(task.wordId);
      wordPronunciationAudio.load();
      wordPronunciationAudio.play();

      this.isCorrectAnswer = this.answer === task.word;
      let newWordLearningProgress = task.wordLearningProgress;
      if (this.isCorrectAnswer && newWordLearningProgress < WordLearningProgressEnum.Three) {
        newWordLearningProgress++;
      }
      if (!this.isCorrectAnswer && newWordLearningProgress > WordLearningProgressEnum.None) {
        newWordLearningProgress--;
      }

      this.answersHistory.push(this.isCorrectAnswer);
      this.helpHistory.push(this.isHelpMode);
      this.exerciseWordStatistics.push(
        new ExerciseWordStatistic(
          task.wordId,
          task.word,
          task.translations,
          task.pictureIds,
          task.usages,
          task.isAnyNewPictureAvailable,
          this.answer,
          this.isCorrectAnswer,
          newWordLearningProgress,
          this.isHelpMode,
        ),
      );

      setTimeout(() => {
        this.submitButtonRef?.nativeElement.focus();
      });

      this.formattedAnswer = task.word + (this.isCorrectAnswer ? '' : ` (not '${this.answer}')`);
      this.questionIndex++;
    }

    if (this.showAnswer && this.questionIndex == this.tasks.length) {
      const result: ExerciseWordResult[] = [];
      for (let i = 0; i < this.tasks.length; i++) {
        result.push(
          new ExerciseWordResult(this.tasks[i].wordId, this.answersHistory[i], this.helpHistory[i]),
        );
      }
      this.apiService.putExerciseResults(result).subscribe({
        next: () => {
          this.userStatisticsService.refresh();
        },
        error: (error) => {
          console.log(error);
        },
      });
    }

    this.showAnswer = !this.showAnswer;
  }

  onDoNotKnow() {
    this.onNext(new NextOptions(true));
  }

  onHelp() {
    this.isHelpMode = true;
    this.answer = '';
    const word = this.tasks[this.questionIndex].word;
    const letters = [...word];
    this.helpModeAnswerLetters = [];
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    letters.forEach((letter) => {
      this.helpModeAnswerLetters.push(new AnswerLetter(letter));
    });
    this.helpModeAnswer = Array(word.length).fill('');
    setTimeout(() => {
      const firstCell = this.helpModeAnswerCells!.get(0);
      firstCell?.nativeElement.focus();
    });

    this.soundService.help();
  }

  onClickLetter(letter: AnswerLetter, targetIndex?: number) {
    if (!letter.Enabled) {
      return;
    }

    // Determine the target cell index
    const index = targetIndex ?? this.helpModeAnswer.findIndex((v) => !v);
    if (index === -1) {
      return;
    }

    const cell = this.helpModeAnswerCells?.get(index);
    if (!cell) {
      return;
    }

    const currentValue = cell.nativeElement.value;

    // If the cell already has a letter, restore it
    if (currentValue) {
      this.restoreLetter(currentValue, index);
    }

    // Insert new letter into target cell
    this.helpModeAnswer[index] = letter.Value;
    letter.Enabled = false;
    letter.UsedInCell = index;

    // Update the input value directly and set cursor to end
    cell.nativeElement.value = letter.Value;
    cell.nativeElement.setSelectionRange(
      cell.nativeElement.value.length,
      cell.nativeElement.value.length,
    );

    // Move focus to next cell only if cursor was at the end
    if (cell.nativeElement.selectionStart === cell.nativeElement.value.length) {
      const nextCell = this.helpModeAnswerCells?.get(index + 1);
      nextCell?.nativeElement.focus();
    }
  }

  onHelpModeAnswerKeyDown(event: KeyboardEvent, i: number) {
    const key = event.key;
    const input = event.target as HTMLInputElement;
    const currentValue = input.value;
    const cursorPos = input.selectionStart ?? 0;

    if (key === 'ArrowLeft') {
      event.preventDefault();
      if (cursorPos > 0) {
        input.setSelectionRange(cursorPos - 1, cursorPos - 1);
      } else {
        this.focusCell(i - 1, true);
      }
      return;
    }

    if (key === 'ArrowRight') {
      event.preventDefault();
      if (cursorPos < currentValue.length) {
        input.setSelectionRange(cursorPos + 1, cursorPos + 1);
      } else {
        this.focusCell(i + 1, false);
      }
      return;
    }

    // Backspace: delete letter only if cursor is after it
    if (key === 'Backspace') {
      event.preventDefault();
      if (cursorPos === 0) {
        this.focusCell(i - 1, true);
        return;
      }
      if (cursorPos > 0 && currentValue) {
        this.restoreLetter(currentValue, i);
        input.value = '';
        this.helpModeAnswer[i] = '';
        input.setSelectionRange(0, 0);
      }
      return;
    }

    // Delete: delete letter only if cursor is before it
    if (key === 'Delete') {
      event.preventDefault();
      if (cursorPos === currentValue.length) {
        this.focusCell(i + 1, false);
        return;
      }
      if (cursorPos < currentValue.length && currentValue) {
        this.restoreLetter(currentValue, i);
        input.value = '';
        this.helpModeAnswer[i] = '';
        input.setSelectionRange(0, 0);
      }
      return;
    }

    if (key.length !== 1) {
      return;
    }

    const letter = this.getEnabledLetter(key);
    if (!letter) {
      event.preventDefault();
      return;
    }

    // Valid letter input
    event.preventDefault();

    // If cell already has a letter, restore the letter that was used in this cell
    if (currentValue) {
      this.restoreLetter(currentValue, i);
    }

    // Insert new letter in current cell
    input.value = key;
    this.helpModeAnswer[i] = key;
    letter.Enabled = false;
    letter.UsedInCell = i;

    // Set cursor to end of input
    input.setSelectionRange(input.value.length, input.value.length);

    // Move focus to next cell only if cursor was at the end
    if (cursorPos === currentValue.length) {
      this.focusCell(i + 1);
    }
  }

  getHelpModeInputCharacter(event: any): string {
    // если event это строка, возвращаем её, иначе берём target.value
    return typeof event === 'string' ? event : (event?.target?.value ?? '');
  }

  // TODO: Check copy&paste.
  onPlayWordPronunciation(wordId: number) {
    const wordPronunciationAudio = new Audio();
    wordPronunciationAudio.src = this.apiService.getWordPronunciationUrl(wordId);
    wordPronunciationAudio.load();
    wordPronunciationAudio.play();
  }

  private startExercise() {
    this.exerciseWordStatistics = [];
    this.questionIndex = 0;
    this.answersHistory = [];
    this.helpHistory = [];
    this.tasks = [];
    this.isBusy = true;
    this.apiService
      .getTranslationsWordExercise()
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (data) => {
          this.tasks = data;
          if (this.staticConfigService.enableTimer) {
            this.timerSubscription = timer(0, 1000).subscribe(this.onTimer.bind(this));
          }
        },
        error: (error) => {
          console.log(error);
        },
      });
  }

  private onTimer(val: number) {
    this.remainingTime = this.staticConfigService.timerValueInSeconds - val;
    if (this.remainingTime === this.staticConfigService.warningTimeInSeconds) {
      this.soundService.beep();
    } else if (this.remainingTime == 12) {
      this.soundService.clockTicking();
    }
    if (this.remainingTime === 0) {
      this.unsubscribeTimer();
      this.onNext();
    }
  }

  private unsubscribeTimer() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  onRepeat() {
    this.startExercise();
  }

  private getEnabledLetter(char: string): AnswerLetter | null {
    return (
      this.helpModeAnswerLetters.find(
        (l) => l.Enabled && l.Value.toLowerCase() === char.toLowerCase(),
      ) ?? null
    );
  }

  private restoreLetter(letterValue: string, cellIndex: number) {
    // Find the letter that was actually used in this cell
    const letter = this.helpModeAnswerLetters.find(
      (l) => l.Value === letterValue && l.UsedInCell === cellIndex,
    );
    if (!letter) {
      return;
    }

    letter.Enabled = true;
    letter.UsedInCell = null;
  }

  private focusCell(index: number, moveToEnd: boolean = false) {
    const cell = this.helpModeAnswerCells?.get(index);
    if (!cell) {
      return;
    }

    cell.nativeElement.focus();
    const len = cell.nativeElement.value.length;
    const pos = moveToEnd ? len : 0;
    cell.nativeElement.setSelectionRange(pos, pos);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
