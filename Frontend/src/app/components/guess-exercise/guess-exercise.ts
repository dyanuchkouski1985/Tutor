import {
  afterNextRender,
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { finalize, take } from 'rxjs/operators';
import { RoundprogressModule } from 'angular-svg-round-progressbar';
import { SvgIconComponent } from 'angular-svg-icon';
import { ProgressBarComponent } from '../../ui/progress-bar';
import { TooltipDirective } from '../../ui/tooltip';
import { DialogService } from '../../ui/dialog';
import { ApiService } from '../../services/api.service';
import { ExerciseCompletionsService } from '../../services/exercise-completions.service';
import { ExerciseTypeEnum } from '../../enums/exercise-type.enum';
import { SoundService } from '../../services/sound.service';
import { StaticConfigService } from '../../services/static.config.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { HighlightWordPipe } from '../../pipes/highlightWord';
import { ExerciseUnavailableComponent } from '../exercise-unavailable/exercise-unavailable';
import { LetterHintComponent } from '../letter-hint/letter-hint';
import { StarComponent } from '../star/star';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import { getTextBounds } from '../../core/text-selection';
import { GuessAnswer, GuessResult, GuessTask } from '../../models/guess-exercise';

@Component({
  selector: 'app-guess-exercise',
  imports: [
    FormsModule,
    ProgressBarComponent,
    RoundprogressModule,
    SvgIconComponent,
    TooltipDirective,
    HighlightWordPipe,
    ExerciseUnavailableComponent,
    LetterHintComponent,
    StarComponent,
  ],
  templateUrl: './guess-exercise.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./guess-exercise.scss'],
})
export class GuessExerciseComponent implements OnInit, OnDestroy {
  @ViewChild('answerInput') answerInput?: ElementRef<HTMLInputElement>;
  @ViewChild('nextButton') nextButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('repeatButton') repeatButton?: ElementRef<HTMLButtonElement>;

  tasks: GuessTask[] = [];
  taskIndex = 0;
  answer = '';
  letterAnswer = '';
  submittedAnswer = '';
  result: GuessAnswer | null = null;
  revealedHintsCount = 0;
  results: GuessResult[] = [];
  isFinished = false;
  isUnavailable = false;
  isBusy = false;
  remainingTime = 0;
  selectedText = '';
  selectionTop = 0;
  selectionLeft = 0;
  error = '';

  private timerSubscription: Subscription | null = null;
  private isDestroyed = false;

  constructor(
    public readonly staticConfigService: StaticConfigService,
    private readonly apiService: ApiService,
    private readonly exerciseCompletionsService: ExerciseCompletionsService,
    private readonly soundService: SoundService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly router: Router,
    private readonly dialogService: DialogService,
    private readonly injector: Injector,
  ) {}

  @HostListener('document:selectionchange')
  @HostListener('window:scroll')
  @HostListener('window:resize')
  onSelectionChange() {
    const selection = document.getSelection();
    const text = selection?.toString().trim() ?? '';

    if (!text || !selection?.rangeCount) {
      this.selectedText = '';
      return;
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container instanceof Element ? container : container.parentElement;
    const rectangle = element?.closest('.selectable') ? getTextBounds(range) : undefined;

    if (!rectangle) {
      this.selectedText = '';
      return;
    }

    this.selectedText = text;
    this.selectionTop = rectangle.top;
    this.selectionLeft = (rectangle.left + rectangle.right) / 2;
  }

  ngOnInit() {
    this.loadTasks();
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.stopTimer();
  }

  get task() {
    return this.tasks[this.taskIndex];
  }

  get isExampleShown() {
    return !!this.task?.example && this.revealedHintsCount >= 1;
  }

  get isLetterHintShown() {
    return this.revealedHintsCount >= (this.task?.example ? 2 : 1);
  }

  get canHelp() {
    return !this.result && !this.isLetterHintShown;
  }

  get currentAnswer() {
    return this.isLetterHintShown ? this.letterAnswer : this.answer;
  }

  get isRepeatAvailable() {
    return this.userStatisticsService.get()?.isAvailableGuessExercise !== false;
  }

  get correctCount() {
    return this.results.filter((result) => result.isCorrect).length;
  }

  get totalPoints() {
    return this.results.reduce((sum, result) => sum + result.points, 0);
  }

  onSubmit() {
    if (this.result) {
      this.onNext();
    } else {
      this.onAnswer();
    }
  }

  onAnswer() {
    if (!this.currentAnswer.trim()) {
      return;
    }
    this.sendAnswer(this.currentAnswer);
  }

  onDontKnow() {
    this.sendAnswer('');
  }

  onHelp() {
    if (!this.canHelp || this.isBusy) {
      return;
    }
    this.revealedHintsCount++;
    this.soundService.help();
    this.focusAnswer();
  }

  onPlayPronunciation() {
    const audio = new Audio(this.apiService.getWordPronunciationUrl(this.task.wordId));
    audio.play();
  }

  onNext() {
    this.selectedText = '';
    this.answer = '';
    this.letterAnswer = '';
    this.submittedAnswer = '';
    this.result = null;
    this.revealedHintsCount = 0;
    this.error = '';

    if (this.taskIndex < this.tasks.length - 1) {
      this.taskIndex++;
      this.startTimer();
      this.focusAnswer();
      return;
    }

    this.isFinished = true;
    this.exerciseCompletionsService.markCompleted(ExerciseTypeEnum.Guess);
    this.focusAfterRender(() => this.repeatButton?.nativeElement);
    this.correctCount === this.results.length
      ? this.soundService.celebrate()
      : this.soundService.finish();
  }

  onRepeat() {
    this.loadTasks();
  }

  onHome() {
    this.router.navigate(['/']);
  }

  onOpenSelection() {
    const word = this.selectedText;

    if (!word) {
      return;
    }

    this.selectedText = '';
    document.getSelection()?.removeAllRanges();
    this.onOpenWordTranslationsDialog(word);
  }

  onOpenWordTranslationsDialog(word: string) {
    this.dialogService.open(WordTranslationsDialogComponent, {
      header: 'Word',
      styleClass: 'word-translations-dialog',
      waitUntilReady: true,
      data: { word: word },
    });
  }

  private sendAnswer(answer: string) {
    if (!this.task || this.result || this.isBusy) {
      return;
    }

    this.stopTimer();
    this.isBusy = true;
    this.error = '';

    this.apiService
      .answerGuess(this.task.wordId, answer, this.revealedHintsCount)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.error = result.error;
            this.focusAnswer();
            return;
          }

          this.result = result;
          this.submittedAnswer = answer.trim();
          this.results.push({
            word: result.word,
            answer: this.submittedAnswer,
            isCorrect: result.isCorrect,
            points: result.points,
          });
          result.isCorrect ? this.soundService.correct() : this.soundService.error();
          this.onPlayPronunciation();
          this.focusAfterRender(() => this.nextButton?.nativeElement);
          this.userStatisticsService.refresh();
        },
        error: (error) => {
          this.error = 'Could not check the answer. Try again.';
          this.focusAnswer();
          console.error(error.message);
        },
      });
  }

  private loadTasks() {
    this.isBusy = true;
    this.error = '';
    this.tasks = [];
    this.taskIndex = 0;
    this.answer = '';
    this.letterAnswer = '';
    this.submittedAnswer = '';
    this.result = null;
    this.revealedHintsCount = 0;
    this.results = [];
    this.isFinished = false;
    this.isUnavailable = false;

    this.apiService
      .getGuessExercise()
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (exercise) => {
          this.error = exercise.error ?? '';
          this.tasks = exercise.tasks;
          this.isUnavailable = !exercise.error && !exercise.tasks.length;
          this.startTimer();
          this.focusAnswer();
        },
        error: (error) => {
          this.error = 'Could not load the exercise.';
          console.error(error.message);
        },
      });
  }

  private focusAnswer() {
    this.focusAfterRender(() => this.answerInput?.nativeElement);
  }

  private focusAfterRender(getElement: () => HTMLElement | undefined) {
    afterNextRender(() => setTimeout(() => getElement()?.focus()), { injector: this.injector });
  }

  private startTimer() {
    this.stopTimer();

    if (this.isDestroyed) {
      return;
    }

    if (!this.staticConfigService.enableTimer || !this.task) {
      return;
    }

    this.remainingTime = this.staticConfigService.timerValueInSeconds;
    this.timerSubscription = timer(0, 1000).subscribe((elapsed) => this.onTimer(elapsed));
  }

  private stopTimer() {
    if (this.timerSubscription) {
      this.soundService.clockTickingReset();
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  private onTimer(elapsed: number) {
    this.remainingTime = this.staticConfigService.timerValueInSeconds - elapsed;

    if (this.remainingTime === this.staticConfigService.warningTimeInSeconds) {
      this.soundService.beep();
    } else if (this.remainingTime === 12) {
      this.soundService.clockTicking();
    }

    if (this.remainingTime <= 0) {
      this.stopTimer();
      this.sendAnswer(this.currentAnswer);
    }
  }
}
