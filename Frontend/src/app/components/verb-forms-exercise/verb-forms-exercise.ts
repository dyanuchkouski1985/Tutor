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
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { finalize, take } from 'rxjs/operators';
import { ProgressBarComponent } from '../../ui/progress-bar';
import { RoundprogressModule } from 'angular-svg-round-progressbar';
import { ApiService } from '../../services/api.service';
import { ExerciseCompletionsService } from '../../services/exercise-completions.service';
import { ExerciseTypeEnum } from '../../enums/exercise-type.enum';
import { SoundService } from '../../services/sound.service';
import { StaticConfigService } from '../../services/static.config.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { SvgIconComponent } from 'angular-svg-icon';
import { TooltipDirective } from '../../ui/tooltip';
import { DialogService } from '../../ui/dialog';
import { ExerciseUnavailableComponent } from '../exercise-unavailable/exercise-unavailable';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import { getTextBounds } from '../../core/text-selection';
import { VerbFormsAnswer, VerbFormsExercise } from '../../models/verb-forms-exercise';

const gap = '___';

@Component({
  selector: 'app-verb-forms-exercise',
  imports: [
    FormsModule,
    ProgressBarComponent,
    RoundprogressModule,
    SvgIconComponent,
    TooltipDirective,
    ExerciseUnavailableComponent,
  ],
  templateUrl: './verb-forms-exercise.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./verb-forms-exercise.scss'],
})
export class VerbFormsExerciseComponent implements OnInit, OnDestroy {
  @ViewChild('answerInput') set answerInput(input: ElementRef<HTMLInputElement> | undefined) {
    if (input) {
      setTimeout(() => input.nativeElement.focus());
    }
  }
  @ViewChild('nextButton') nextButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('repeatButton') repeatButton?: ElementRef<HTMLButtonElement>;

  exercise: VerbFormsExercise | null = null;
  taskIndex = 0;
  answer = '';
  answers: string[] = [];
  results: (VerbFormsAnswer | null)[] = [];
  isFinished = false;
  isUnavailable = false;
  isBusy = false;
  error = '';
  selectedText = '';
  selectionTop = 0;
  selectionLeft = 0;
  remainingTime = 0;

  private loadSubscription: Subscription | null = null;
  private timerSubscription: Subscription | null = null;
  private isDestroyed = false;

  constructor(
    private readonly apiService: ApiService,
    private readonly exerciseCompletionsService: ExerciseCompletionsService,
    private readonly soundService: SoundService,
    readonly staticConfigService: StaticConfigService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly router: Router,
    private readonly injector: Injector,
    private readonly dialogService: DialogService,
  ) {}

  ngOnInit() {
    this.userStatisticsService.refresh();
    this.loadExercise();
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.loadSubscription?.unsubscribe();
    this.stopTimer();
  }

  get tasks() {
    return this.exercise?.tasks ?? [];
  }

  get task() {
    return this.tasks[this.taskIndex] ?? null;
  }

  get result() {
    return this.results[this.taskIndex] ?? null;
  }

  get sentenceParts() {
    return this.splitSentence(this.task?.sentence ?? '');
  }

  get answeredCount() {
    return this.results.filter((result) => result !== null).length;
  }

  get progressPercent() {
    return this.tasks.length ? (100 * this.answeredCount) / this.tasks.length : 0;
  }

  get dailyPoints() {
    return this.userStatisticsService.get()?.verbFormsPercentage ?? 0;
  }

  get dailyLimit() {
    return this.userStatisticsService.get()?.verbFormsMaxDailyPoints ?? 0;
  }

  get isLimitReached() {
    return this.dailyPoints >= this.dailyLimit;
  }

  get correctCount() {
    return this.results.filter((result) => result?.isCorrect).length;
  }

  get totalPoints() {
    return this.results.reduce((sum, result) => sum + (result?.points ?? 0), 0);
  }

  get isRepeatAvailable() {
    return this.userStatisticsService.get()?.isAvailableVerbFormsExercise !== false;
  }

  onCheck() {
    if (!this.answer.trim()) {
      return;
    }

    this.submit(this.answer.trim());
  }

  onDontKnow() {
    this.submit('');
  }

  onNext() {
    if (!this.result) {
      return;
    }

    if (this.taskIndex < this.tasks.length - 1) {
      this.taskIndex++;
      this.answer = '';
      this.startTimer();
      return;
    }

    this.isFinished = true;
    this.exerciseCompletionsService.markCompleted(ExerciseTypeEnum.VerbForms);
    this.focusAfterRender(() => this.repeatButton?.nativeElement);
    this.correctCount === this.tasks.length
      ? this.soundService.celebrate()
      : this.soundService.finish();
  }

  reviewSentence(taskIndex: number) {
    const parts = this.splitSentence(this.tasks[taskIndex].sentence);
    const answer = this.results[taskIndex]?.correctAnswer ?? '';

    return `${parts.before}${answer}${parts.after}`.replace(/\s{2,}/g, ' ').trim();
  }

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

  onOpenWordTranslationsDialog() {
    const word = this.selectedText;

    if (!word) {
      return;
    }

    this.selectedText = '';
    document.getSelection()?.removeAllRanges();

    this.dialogService.open(WordTranslationsDialogComponent, {
      header: 'Word',
      styleClass: 'word-translations-dialog',
      waitUntilReady: true,
      data: { word: word },
    });
  }

  onRepeat() {
    this.loadExercise();
  }

  onHome() {
    this.router.navigate(['/']);
  }

  private submit(answer: string) {
    if (!this.exercise?.key || this.result || this.isBusy) {
      return;
    }

    const taskIndex = this.taskIndex;

    this.stopTimer();
    this.isBusy = true;
    this.error = '';

    this.apiService
      .answerVerbForms(this.exercise.key, taskIndex, answer)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.error = result.error;
            return;
          }

          this.answers[taskIndex] = answer;
          this.results[taskIndex] = result;
          this.userStatisticsService.refresh();
          result.isCorrect ? this.soundService.correct() : this.soundService.error();
          this.focusAfterRender(() => this.nextButton?.nativeElement);
        },
        error: (error) => {
          this.error = 'Could not check the answer. Try again.';
          console.error(error.message);
        },
      });
  }

  private splitSentence(sentence: string) {
    const index = sentence.indexOf(gap);

    return index < 0
      ? { before: sentence, after: '' }
      : { before: sentence.slice(0, index), after: sentence.slice(index + gap.length) };
  }

  private loadExercise() {
    this.isBusy = true;
    this.error = '';
    this.exercise = null;
    this.taskIndex = 0;
    this.answer = '';
    this.answers = [];
    this.results = [];
    this.isFinished = false;
    this.isUnavailable = false;
    this.stopTimer();

    this.loadSubscription?.unsubscribe();
    this.loadSubscription = this.apiService
      .getVerbFormsExercise()
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (exercise) => {
          this.error = exercise.error ?? '';
          this.isUnavailable = !exercise.error && !exercise.tasks.length;

          if (!exercise.tasks.length) {
            return;
          }

          this.exercise = exercise;
          this.answers = exercise.tasks.map(() => '');
          this.results = exercise.tasks.map(() => null);
          this.startTimer();
        },
        error: (error) => {
          this.error = 'Could not load the exercise.';
          console.error(error.message);
        },
      });
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
      this.submit(this.answer.trim());
    }
  }

  private focusAfterRender(getElement: () => HTMLElement | undefined) {
    afterNextRender(() => setTimeout(() => getElement()?.focus()), { injector: this.injector });
  }
}
