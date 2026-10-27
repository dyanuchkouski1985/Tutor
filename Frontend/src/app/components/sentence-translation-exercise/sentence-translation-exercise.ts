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
import { Subscription, timer } from 'rxjs';
import { RoundprogressModule } from 'angular-svg-round-progressbar';
import { SvgIconComponent } from 'angular-svg-icon';
import { FormsModule } from '@angular/forms';
import { SelectButtonComponent } from '../../ui/select-button';
import { ProgressBarComponent } from '../../ui/progress-bar';
import { TooltipDirective } from '../../ui/tooltip';
import { finalize, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ExerciseCompletionsService } from '../../services/exercise-completions.service';
import { ExerciseTypeEnum } from '../../enums/exercise-type.enum';
import { DynamicConfigService } from '../../services/dynamic.config.service';
import { StaticConfigService } from '../../services/static.config.service';
import { LanguageEnum } from '../../enums/language.enum';
import { TranslationLanguageEnum } from '../../enums/translation-language.enum';
import {
  SentenceTranslationAnswer,
  SentenceTranslationHint,
  SentenceTranslationResult,
  SentenceTranslationSegment,
  SentenceTranslationTask,
} from '../../models/sentence-translation-exercise';
import { SoundService } from '../../services/sound.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { DialogService } from '../../ui/dialog';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import { getTextBounds } from '../../core/text-selection';

@Component({
  selector: 'app-sentence-translation-exercise',
  imports: [
    FormsModule,
    SelectButtonComponent,
    ProgressBarComponent,
    RoundprogressModule,
    SvgIconComponent,
    TooltipDirective,
  ],
  templateUrl: './sentence-translation-exercise.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./sentence-translation-exercise.scss'],
})
export class SentenceTranslationExerciseComponent implements OnInit, OnDestroy {
  @ViewChild('answerInput') answerInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('nextButton') nextButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('repeatButton') repeatButton?: ElementRef<HTMLButtonElement>;

  translationLanguageOptions: { label: string; value: TranslationLanguageEnum }[] = [];
  sentenceLanguage = TranslationLanguageEnum.Russian;
  tasks: SentenceTranslationTask[] = [];
  taskIndex = 0;
  answer = '';
  result: SentenceTranslationAnswer | null = null;
  isGivenUp = false;
  isHelpShown = false;
  segments: SentenceTranslationSegment[] = [];
  revealedHints = new Set<SentenceTranslationHint>();
  revealedHintsCount = 0;
  isFinished = false;
  results: SentenceTranslationResult[] = [];
  isBusy = false;
  remainingTime = 0;
  selectedText = '';
  selectionTop = 0;
  selectionLeft = 0;

  private timerSubscription: Subscription | null = null;
  private isDestroyed = false;
  error = '';

  constructor(
    public readonly staticConfigService: StaticConfigService,
    private readonly dynamicConfigService: DynamicConfigService,
    private readonly apiService: ApiService,
    private readonly exerciseCompletionsService: ExerciseCompletionsService,
    private readonly soundService: SoundService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly router: Router,
    private readonly dialogService: DialogService,
    private readonly injector: Injector,
  ) {}

  get timerValueInSeconds() {
    return Math.round(this.staticConfigService.timerValueInSeconds * 1.5);
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

  ngOnInit() {
    this.translationLanguageOptions =
      this.dynamicConfigService.language === LanguageEnum.Polish
        ? [
            { label: 'EN', value: TranslationLanguageEnum.English },
            { label: 'RU', value: TranslationLanguageEnum.Russian },
          ]
        : [
            { label: 'RU', value: TranslationLanguageEnum.Russian },
            { label: 'PL', value: TranslationLanguageEnum.Polish },
          ];

    const isAvailable = this.translationLanguageOptions.some(
      (option) => option.value === this.dynamicConfigService.sentenceLanguage,
    );

    this.sentenceLanguage = isAvailable
      ? this.dynamicConfigService.sentenceLanguage!
      : TranslationLanguageEnum.Russian;

    this.loadSentences();
  }

  onSentenceLanguageChange(sentenceLanguage: TranslationLanguageEnum) {
    const previousSentenceLanguage = this.sentenceLanguage;
    this.sentenceLanguage = sentenceLanguage;
    this.dynamicConfigService.sentenceLanguage = sentenceLanguage;

    if (!this.tasks.length) {
      this.loadSentences();
      return;
    }

    const pendingIndex = this.isAnswered ? this.taskIndex + 1 : this.taskIndex;
    const pendingCount = this.tasks.length - pendingIndex;

    if (!pendingCount) {
      return;
    }

    this.isBusy = true;
    this.error = '';

    this.apiService
      .getSentenceTranslationExercise(sentenceLanguage, pendingCount)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (result) => {
          if (result.error || !result.tasks.length) {
            this.error = result.error || 'Could not translate the sentences.';
            this.restoreSentenceLanguage(previousSentenceLanguage);
            return;
          }

          this.tasks = [...this.tasks.slice(0, pendingIndex), ...result.tasks];

          if (this.isHelpShown && !this.isAnswered) {
            this.revealedHints.clear();
            this.segments = this.buildSegments(this.task);
          }

          if (!this.isAnswered) {
            this.startTimer();
            this.focusAnswer();
          }
        },
        error: (error) => {
          this.error = 'Could not translate the sentences.';
          this.restoreSentenceLanguage(previousSentenceLanguage);
          console.error(error.message);
        },
      });
  }

  get task() {
    return this.tasks[this.taskIndex];
  }

  get isAnswered() {
    return this.result !== null || this.isGivenUp;
  }

  onAnswer() {
    if (!this.task || !this.answer.trim() || this.isBusy) {
      return;
    }

    this.stopTimer();
    this.isBusy = true;
    this.error = '';

    this.apiService
      .answerSentenceTranslation(this.task.sentence, this.answer, this.revealedHintsCount)
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
          this.focusNext();
          this.addResult(result.naturalTranslation, result.points, result.isCorrect);
          result.isCorrect ? this.soundService.correct() : this.soundService.error();
          this.userStatisticsService.refresh();
        },
        error: (error) => {
          this.error = 'Could not check the answer. Try again.';
          this.focusAnswer();
          console.error(error.message);
        },
      });
  }

  onDontKnow() {
    if (!this.task || this.isBusy) {
      return;
    }

    this.stopTimer();
    this.error = '';
    this.isGivenUp = true;
    this.focusNext();
    this.addResult(this.task.translation, 0, false);
    this.soundService.error();
  }

  onHelp() {
    if (!this.task || this.isHelpShown || this.isBusy || this.isAnswered) {
      return;
    }

    this.soundService.help();
    this.isHelpShown = true;
    this.segments = this.buildSegments(this.task);
  }

  onRevealHint(hint: SentenceTranslationHint) {
    if (this.revealedHints.has(hint)) {
      return;
    }

    this.revealedHints.add(hint);

    if (!this.isAnswered) {
      this.revealedHintsCount++;
    }
  }

  onNext() {
    this.answer = '';
    this.result = null;
    this.isGivenUp = false;
    this.error = '';
    this.resetHelp();

    if (this.taskIndex < this.tasks.length - 1) {
      this.taskIndex++;
      this.startTimer();
      this.focusAnswer();
      return;
    }

    this.isFinished = true;
    this.exerciseCompletionsService.markCompleted(ExerciseTypeEnum.SentenceTranslation);
    this.focusAfterRender(() => this.repeatButton?.nativeElement);
    this.results.every((result) => result.isCorrect)
      ? this.soundService.celebrate()
      : this.soundService.finish();
  }

  get correctCount() {
    return this.results.filter((result) => result.isCorrect).length;
  }

  get totalPoints() {
    return this.results.reduce((sum, result) => sum + result.points, 0);
  }

  onHome() {
    this.router.navigate(['/']);
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.stopTimer();
  }

  onEnter(event: Event) {
    event.preventDefault();

    if (this.isAnswered) {
      this.onNext();
    } else {
      this.onAnswer();
    }
  }

  private focusAnswer() {
    this.focusAfterRender(() => this.answerInput?.nativeElement);
  }

  private focusNext() {
    this.focusAfterRender(() => this.nextButton?.nativeElement);
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

    this.remainingTime = this.timerValueInSeconds;
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
    this.remainingTime = this.timerValueInSeconds - elapsed;

    if (this.remainingTime === this.staticConfigService.warningTimeInSeconds) {
      this.soundService.beep();
    } else if (this.remainingTime === 12) {
      this.soundService.clockTicking();
    }

    if (this.remainingTime <= 0) {
      this.stopTimer();
      this.onTimeUp();
    }
  }

  private onTimeUp() {
    if (this.isAnswered || this.isBusy) {
      return;
    }

    this.answer.trim() ? this.onAnswer() : this.onDontKnow();
  }

  onRepeat() {
    this.loadSentences();
  }

  private restoreSentenceLanguage(sentenceLanguage: TranslationLanguageEnum) {
    this.sentenceLanguage = sentenceLanguage;
    this.dynamicConfigService.sentenceLanguage = sentenceLanguage;
  }

  private resetHelp() {
    this.isHelpShown = false;
    this.segments = [];
    this.revealedHints.clear();
    this.revealedHintsCount = 0;
  }

  private buildSegments(task: SentenceTranslationTask): SentenceTranslationSegment[] {
    const sentence = task.sentence;
    const lowerSentence = sentence.toLowerCase();
    const matches = task.hints
      .map((hint) => ({ hint, index: lowerSentence.indexOf(hint.fragment.toLowerCase()) }))
      .filter((match) => match.index >= 0)
      .sort((a, b) => a.index - b.index);

    const segments: SentenceTranslationSegment[] = [];
    let position = 0;

    for (const { hint, index } of matches) {
      if (index < position) {
        continue;
      }

      if (index > position) {
        segments.push({ text: sentence.slice(position, index), hint: null });
      }

      segments.push({ text: sentence.slice(index, index + hint.fragment.length), hint });
      position = index + hint.fragment.length;
    }

    if (position < sentence.length) {
      segments.push({ text: sentence.slice(position), hint: null });
    }

    return segments;
  }

  private addResult(naturalTranslation: string, points: number, isCorrect: boolean) {
    this.results.push({
      sentence: this.task.sentence,
      answer: this.answer.trim(),
      naturalTranslation,
      points,
      isCorrect,
    });
  }

  private loadSentences() {
    this.isBusy = true;
    this.error = '';
    this.tasks = [];
    this.taskIndex = 0;
    this.answer = '';
    this.result = null;
    this.isGivenUp = false;
    this.resetHelp();
    this.isFinished = false;
    this.results = [];

    this.apiService
      .getSentenceTranslationExercise(this.sentenceLanguage)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (exercise) => {
          this.error = exercise.error ?? '';
          this.tasks = exercise.tasks;
          this.startTimer();
          this.focusAnswer();
        },
        error: (error) => {
          this.error = 'Could not load the exercise.';
          console.error(error.message);
        },
      });
  }
}
