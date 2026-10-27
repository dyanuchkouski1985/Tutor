import {
  afterNextRender,
  Component,
  ElementRef,
  HostListener,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize, take } from 'rxjs/operators';
import { ProgressBarComponent } from '../../ui/progress-bar';
import { ApiService } from '../../services/api.service';
import { ExerciseCompletionsService } from '../../services/exercise-completions.service';
import { SoundService } from '../../services/sound.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { SvgIconComponent } from 'angular-svg-icon';
import { TooltipDirective } from '../../ui/tooltip';
import { DialogService } from '../../ui/dialog';
import { ExerciseUnavailableComponent } from '../exercise-unavailable/exercise-unavailable';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import { getTextBounds } from '../../core/text-selection';
import {
  GapChoiceAnswer,
  GapChoiceExercise,
  GapChoiceExerciseConfig,
} from '../../models/gap-choice-exercise';

const gap = '___';
const noWordOption = '—';

@Component({
  selector: 'app-gap-choice-exercise',
  imports: [ProgressBarComponent, SvgIconComponent, TooltipDirective, ExerciseUnavailableComponent],
  templateUrl: './gap-choice-exercise.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./gap-choice-exercise.scss'],
})
export class GapChoiceExerciseComponent implements OnInit, OnDestroy {
  @Input({ required: true }) config!: GapChoiceExerciseConfig;

  @ViewChild('nextButton') nextButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('repeatButton') repeatButton?: ElementRef<HTMLButtonElement>;

  readonly noWordOption = noWordOption;
  exercise: GapChoiceExercise | null = null;
  taskIndex = 0;
  answers: (number | null)[] = [];
  results: (GapChoiceAnswer | null)[] = [];
  isFinished = false;
  isUnavailable = false;
  isBusy = false;
  error = '';
  selectedText = '';
  selectionTop = 0;
  selectionLeft = 0;

  private loadSubscription: Subscription | null = null;

  constructor(
    private readonly apiService: ApiService,
    private readonly exerciseCompletionsService: ExerciseCompletionsService,
    private readonly soundService: SoundService,
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
    this.loadSubscription?.unsubscribe();
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

  get answer() {
    return this.answers[this.taskIndex] ?? null;
  }

  get sentenceParts() {
    const sentence = this.task?.sentence ?? '';
    const index = sentence.indexOf(gap);

    return index < 0
      ? { before: sentence, after: '' }
      : { before: sentence.slice(0, index), after: sentence.slice(index + gap.length) };
  }

  get answeredCount() {
    return this.results.filter((result) => result !== null).length;
  }

  get progressPercent() {
    return this.tasks.length ? (100 * this.answeredCount) / this.tasks.length : 0;
  }

  get dailyPoints() {
    const statistics = this.userStatisticsService.get();

    return statistics ? this.config.dailyPoints(statistics) : 0;
  }

  get dailyLimit() {
    const statistics = this.userStatisticsService.get();

    return statistics ? this.config.dailyLimit(statistics) : 0;
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
    const statistics = this.userStatisticsService.get();

    return !statistics || this.config.isAvailable(statistics) !== false;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.task || this.isFinished || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const optionIndex = Number(event.key) - 1;

    if (!this.result && optionIndex >= 0 && optionIndex < this.task.options.length) {
      event.preventDefault();
      this.onSelectOption(optionIndex);
    }
  }

  onSelectOption(optionIndex: number) {
    if (!this.exercise?.key || this.result || this.isBusy) {
      return;
    }

    const taskIndex = this.taskIndex;

    this.answers[taskIndex] = optionIndex;
    this.isBusy = true;
    this.error = '';

    this.apiService
      .answerGapChoice(this.config.apiName, this.exercise.key, taskIndex, optionIndex)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.answers[taskIndex] = null;
            this.error = result.error;
            return;
          }

          this.results[taskIndex] = result;
          this.userStatisticsService.refresh();
          result.isCorrect ? this.soundService.correct() : this.soundService.error();
          this.focusAfterRender(() => this.nextButton?.nativeElement);
        },
        error: (error) => {
          this.answers[taskIndex] = null;
          this.error = 'Could not check the answer. Try again.';
          console.error(error.message);
        },
      });
  }

  onNext() {
    if (!this.result) {
      return;
    }

    if (this.taskIndex < this.tasks.length - 1) {
      this.taskIndex++;
      return;
    }

    this.isFinished = true;
    this.exerciseCompletionsService.markCompleted(this.config.exercise);
    this.focusAfterRender(() => this.repeatButton?.nativeElement);
    this.correctCount === this.tasks.length
      ? this.soundService.celebrate()
      : this.soundService.finish();
  }

  optionText(optionIndex: number | null) {
    const option = optionIndex === null ? '' : (this.task?.options[optionIndex] ?? '');

    return option === noWordOption ? '' : option;
  }

  filledSentence(taskIndex: number, optionIndex: number) {
    const task = this.tasks[taskIndex];
    const option = task.options[optionIndex];

    return task.sentence
      .replace(gap, option === noWordOption ? '' : option)
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,!?;:])/g, '$1')
      .trim();
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

  private loadExercise() {
    this.isBusy = true;
    this.error = '';
    this.exercise = null;
    this.taskIndex = 0;
    this.answers = [];
    this.results = [];
    this.isFinished = false;
    this.isUnavailable = false;

    this.loadSubscription?.unsubscribe();
    this.loadSubscription = this.apiService
      .getGapChoiceExercise(this.config.apiName)
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
          this.answers = exercise.tasks.map(() => null);
          this.results = exercise.tasks.map(() => null);
        },
        error: (error) => {
          this.error = 'Could not load the exercise.';
          console.error(error.message);
        },
      });
  }

  private focusAfterRender(getElement: () => HTMLElement | undefined) {
    afterNextRender(() => setTimeout(() => getElement()?.focus()), { injector: this.injector });
  }
}
