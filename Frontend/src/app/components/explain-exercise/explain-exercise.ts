import {
  afterNextRender,
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize, take } from 'rxjs/operators';
import { SvgIconComponent } from 'angular-svg-icon';
import { ProgressBarComponent } from '../../ui/progress-bar';
import { TooltipDirective } from '../../ui/tooltip';
import { DialogService } from '../../ui/dialog';
import { ApiService } from '../../services/api.service';
import { ExerciseCompletionsService } from '../../services/exercise-completions.service';
import { ExerciseTypeEnum } from '../../enums/exercise-type.enum';
import { SoundService } from '../../services/sound.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { HighlightWordPipe } from '../../pipes/highlightWord';
import { ExerciseUnavailableComponent } from '../exercise-unavailable/exercise-unavailable';
import { StarComponent } from '../star/star';
import { getTextBounds } from '../../core/text-selection';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import {
  ExplainAttempt,
  ExplainGuess,
  ExplainResult,
  ExplainTask,
} from '../../models/explain-exercise';

@Component({
  selector: 'app-explain-exercise',
  imports: [
    FormsModule,
    ProgressBarComponent,
    SvgIconComponent,
    TooltipDirective,
    HighlightWordPipe,
    ExerciseUnavailableComponent,
    StarComponent,
  ],
  templateUrl: './explain-exercise.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./explain-exercise.scss'],
})
export class ExplainExerciseComponent implements OnInit {
  @ViewChild('explanationInput') explanationInput?: ElementRef<HTMLInputElement>;
  @ViewChild('nextButton') nextButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('repeatButton') repeatButton?: ElementRef<HTMLButtonElement>;

  readonly maxAttemptsCount = 3;

  tasks: ExplainTask[] = [];
  taskIndex = 0;
  explanation = '';
  attempts: ExplainAttempt[] = [];
  result: ExplainGuess | null = null;
  isHintShown = false;
  reason = '';
  results: ExplainResult[] = [];
  isFinished = false;
  isUnavailable = false;
  isBusy = false;
  error = '';
  selectedText = '';
  selectionTop = 0;
  selectionLeft = 0;

  constructor(
    private readonly apiService: ApiService,
    private readonly exerciseCompletionsService: ExerciseCompletionsService,
    private readonly soundService: SoundService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly router: Router,
    private readonly dialogService: DialogService,
    private readonly injector: Injector,
  ) {}

  ngOnInit() {
    this.loadTasks();
  }

  get task() {
    return this.tasks[this.taskIndex];
  }

  get attemptsLeft() {
    return this.maxAttemptsCount - this.attempts.length;
  }

  get isRepeatAvailable() {
    return this.userStatisticsService.get()?.isAvailableExplainExercise !== false;
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
      this.onExplain();
    }
  }

  onExplain() {
    const explanation = this.explanation.trim();

    if (!explanation) {
      return;
    }

    this.sendExplanation(explanation, false);
  }

  onDontKnow() {
    this.sendExplanation('', true);
  }

  private sendExplanation(explanation: string, isGivenUp: boolean) {
    if (!this.task || this.result || this.isBusy) {
      return;
    }

    this.isBusy = true;
    this.error = '';
    this.reason = '';

    this.apiService
      .guessExplain(this.task.wordId, explanation, this.attempts, this.isHintShown, isGivenUp)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (guess) => this.onGuess(guess, explanation),
        error: (error) => {
          this.error = 'Could not send the explanation. Try again.';
          this.focusExplanation();
          console.error(error.message);
        },
      });
  }

  onHelp() {
    if (this.isHintShown || this.result || this.isBusy) {
      return;
    }

    this.isHintShown = true;
    this.soundService.help();
    this.focusExplanation();
  }

  onPlayPronunciation() {
    const audio = new Audio(this.apiService.getWordPronunciationUrl(this.task.wordId));
    audio.play();
  }

  onNext() {
    this.selectedText = '';
    this.explanation = '';
    this.attempts = [];
    this.result = null;
    this.isHintShown = false;
    this.reason = '';
    this.error = '';

    if (this.taskIndex < this.tasks.length - 1) {
      this.taskIndex++;
      this.focusExplanation();
      return;
    }

    this.isFinished = true;
    this.exerciseCompletionsService.markCompleted(ExerciseTypeEnum.Explain);
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

  onOpenSelectedText() {
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

  private onGuess(guess: ExplainGuess, explanation: string) {
    if (guess.error) {
      this.error = guess.error;
      this.focusExplanation();
      return;
    }

    if (!guess.isValid) {
      this.reason = guess.reason ?? '';
      this.soundService.error();
      this.focusExplanation();
      return;
    }

    if (explanation) {
      this.attempts = [...this.attempts, { explanation, guess: guess.guess ?? '' }];
    }
    this.explanation = '';

    if (!guess.isFinished) {
      this.soundService.error();
      this.focusExplanation();
      return;
    }

    this.result = guess;
    this.results.push({
      word: this.task.word,
      isCorrect: guess.isCorrect,
      points: guess.points,
      attemptsCount: this.attempts.length,
    });
    guess.isCorrect ? this.soundService.correct() : this.soundService.error();
    this.onPlayPronunciation();
    this.focusAfterRender(() => this.nextButton?.nativeElement);
    this.userStatisticsService.refresh();
  }

  private loadTasks() {
    this.isBusy = true;
    this.error = '';
    this.tasks = [];
    this.taskIndex = 0;
    this.explanation = '';
    this.attempts = [];
    this.result = null;
    this.isHintShown = false;
    this.reason = '';
    this.results = [];
    this.isFinished = false;
    this.isUnavailable = false;

    this.apiService
      .getExplainExercise()
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (exercise) => {
          this.tasks = exercise.tasks;
          this.isUnavailable = !exercise.tasks.length;
          this.focusExplanation();
        },
        error: (error) => {
          this.error = 'Could not load the exercise.';
          console.error(error.message);
        },
      });
  }

  private focusExplanation() {
    this.focusAfterRender(() => this.explanationInput?.nativeElement);
  }

  private focusAfterRender(getElement: () => HTMLElement | undefined) {
    afterNextRender(() => setTimeout(() => getElement()?.focus()), { injector: this.injector });
  }
}
