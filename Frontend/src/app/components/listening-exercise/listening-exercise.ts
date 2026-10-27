import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Injector,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize, take } from 'rxjs/operators';
import { SvgIconComponent } from 'angular-svg-icon';
import { FormsModule } from '@angular/forms';
import { SelectButtonComponent } from '../../ui/select-button';
import { ProgressBarComponent } from '../../ui/progress-bar';
import { TooltipDirective } from '../../ui/tooltip';
import { DialogService } from '../../ui/dialog';
import { ApiService } from '../../services/api.service';
import { ExerciseCompletionsService } from '../../services/exercise-completions.service';
import { ExerciseTypeEnum } from '../../enums/exercise-type.enum';
import { SoundService } from '../../services/sound.service';
import { SpeechService, VoiceAssignment } from '../../services/speech.service';
import { DynamicConfigService } from '../../services/dynamic.config.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { LanguageEnum } from '../../enums/language.enum';
import { TranslationLanguageEnum } from '../../enums/translation-language.enum';
import { ExerciseUnavailableComponent } from '../exercise-unavailable/exercise-unavailable';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import { getTextBounds } from '../../core/text-selection';
import { ListeningAnswer, ListeningExercise } from '../../models/listening-exercise';

const playbackRates = [0.75, 1, 1.25, 1.5, 2];
const correctPoints = 4;
const replayedPoints = 2;
const textShownPoints = 1;
const progressCatchUpRate = 2;
const maxFrameSeconds = 0.1;
const defaultCharsPerSecond = 14;

@Component({
  selector: 'app-listening-exercise',
  imports: [
    FormsModule,
    SelectButtonComponent,
    ProgressBarComponent,
    SvgIconComponent,
    TooltipDirective,
    ExerciseUnavailableComponent,
  ],
  templateUrl: './listening-exercise.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./listening-exercise.scss'],
})
export class ListeningExerciseComponent implements OnInit, OnDestroy {
  @ViewChild('repeatButton') repeatButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('startButton') startButton?: ElementRef<HTMLButtonElement>;

  exercise: ListeningExercise | null = null;
  readonly translationLanguageOptions = [
    { label: 'RU', value: TranslationLanguageEnum.Russian },
    { label: 'PL', value: TranslationLanguageEnum.Polish },
  ];
  translationLanguage = TranslationLanguageEnum.Russian;
  lineIndex = 0;
  playedPercent = 0;
  isPlaying = false;
  readonly playbackRates = playbackRates;
  playbackRate = 1;
  readonly correctPoints = correctPoints;
  readonly replayedPoints = replayedPoints;
  readonly textShownPoints = textShownPoints;
  isStarted = false;
  isFirstListenDone = false;
  isHelpShown = false;
  isReplayed = false;
  isTextShown = false;
  answers: (number | null)[] = [];
  results: (ListeningAnswer | null)[] = [];
  shownTranslations = new Set<number>();
  isUnavailable = false;
  isBusy = false;
  error = '';
  selectedText = '';
  selectionTop = 0;
  selectionLeft = 0;

  private assignments = new Map<number, VoiceAssignment>();
  private loadSubscription: Subscription | null = null;
  private playRequestId = 0;
  private progressFrame = 0;
  private lineDurations: number[] = [];
  private measuredChars = 0;
  private measuredSeconds = 0;

  constructor(
    public readonly dynamicConfigService: DynamicConfigService,
    private readonly apiService: ApiService,
    private readonly exerciseCompletionsService: ExerciseCompletionsService,
    private readonly soundService: SoundService,
    private readonly speechService: SpeechService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly router: Router,
    private readonly dialogService: DialogService,
    private readonly injector: Injector,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly zone: NgZone,
  ) {}

  ngOnInit() {
    const isAvailable = this.translationLanguageOptions.some(
      (option) => option.value === this.dynamicConfigService.sentenceLanguage,
    );

    this.translationLanguage = isAvailable
      ? this.dynamicConfigService.sentenceLanguage!
      : TranslationLanguageEnum.Russian;

    this.loadExercise();
  }

  ngOnDestroy() {
    this.loadSubscription?.unsubscribe();
    this.stopPlaying();
    this.speechService.playbackRate = 1;
  }

  get lines() {
    return this.exercise?.lines ?? [];
  }

  get questions() {
    return this.exercise?.questions ?? [];
  }

  get pointsPerAnswer() {
    return this.isTextShown ? textShownPoints : this.isReplayed ? replayedPoints : correctPoints;
  }

  get isListeningFree() {
    return this.isTextShown || this.isFinished;
  }

  get canReplay() {
    return !this.isReplayed || this.isListeningFree;
  }

  get isFinished() {
    return this.results.length > 0 && this.results.every((result) => result !== null);
  }

  get correctCount() {
    return this.results.filter((result) => result?.isCorrect).length;
  }

  get totalPoints() {
    return this.results.reduce((sum, result) => sum + (result?.points ?? 0), 0);
  }

  get hasTranslations() {
    return this.isFinished && this.lines.some((line) => !!line.translation);
  }

  get areAllTranslationsShown() {
    return this.lines.every(
      (line, index) => !line.translation || this.shownTranslations.has(index),
    );
  }

  get isRepeatAvailable() {
    return this.userStatisticsService.get()?.isAvailableListeningExercise !== false;
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
    const rectangle =
      element?.closest('.selectable') && !element.closest('.translation')
        ? getTextBounds(range)
        : undefined;

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

  participantName(participantId: number) {
    return this.exercise?.participants.find((p) => p.id === participantId)?.name ?? '';
  }

  onTranslationLanguageChange(translationLanguage: TranslationLanguageEnum) {
    this.translationLanguage = translationLanguage;
    this.dynamicConfigService.sentenceLanguage = translationLanguage;

    if (!this.isStarted) {
      this.loadExercise();
    }
  }

  onStart() {
    if (this.isStarted || !this.exercise) {
      return;
    }
    this.isStarted = true;
    this.playFrom(0);
  }

  onReplay() {
    if (!this.canReplay || this.isBusy) {
      return;
    }
    if (!this.isListeningFree) {
      this.isReplayed = true;
    }
    this.playFrom(0);
  }

  onStopListening() {
    this.stopPlaying();
  }

  onPlayLine(index: number) {
    this.playFrom(index, true);
  }

  onToggleTranslation(index: number) {
    if (!this.hasTranslations || !this.lines[index]?.translation) {
      return;
    }
    if (!this.shownTranslations.delete(index)) {
      this.shownTranslations.add(index);
    }
  }

  onToggleAllTranslations() {
    this.shownTranslations = this.areAllTranslationsShown
      ? new Set()
      : new Set(this.lines.map((_, index) => index));
  }

  onSetPlaybackRate(rate: number) {
    this.playbackRate = rate;
    this.speechService.playbackRate = rate;
  }

  onHelp() {
    if (this.isBusy) {
      return;
    }
    this.isHelpShown = true;
    this.soundService.help();
  }

  onShowText() {
    this.isTextShown = true;
  }

  onSelectOption(questionIndex: number, optionIndex: number) {
    if (this.results[questionIndex] || this.isBusy) {
      return;
    }
    this.answers[questionIndex] = optionIndex;
  }

  onCheck(questionIndex: number) {
    const answer = this.answers[questionIndex];

    if (!this.exercise?.key || answer === null || this.results[questionIndex] || this.isBusy) {
      return;
    }

    this.isBusy = true;
    this.error = '';

    this.apiService
      .answerListening(this.exercise.key, questionIndex, answer, this.isTextShown, this.isReplayed)
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

          this.results[questionIndex] = result;
          this.userStatisticsService.refresh();

          if (!this.isFinished) {
            result.isCorrect ? this.soundService.correct() : this.soundService.error();
            return;
          }

          this.exerciseCompletionsService.markCompleted(ExerciseTypeEnum.Listening);
          this.isTextShown = true;
          this.focusAfterRender(() => this.repeatButton?.nativeElement);
          this.correctCount === this.questions.length
            ? this.soundService.celebrate()
            : this.soundService.finish();
        },
        error: (error) => {
          this.error = 'Could not check the answer. Try again.';
          console.error(error.message);
        },
      });
  }

  onRepeat() {
    this.loadExercise();
  }

  onHome() {
    this.router.navigate(['/']);
  }

  private async playFrom(index: number, isSingleLine = false) {
    const requestId = ++this.playRequestId;

    this.isPlaying = true;
    this.lineIndex = index;
    this.playedPercent = this.targetPercent();
    this.startProgressLoop();

    for (let i = index; i < this.lines.length; i++) {
      this.lineIndex = i;

      const line = this.lines[i];
      await this.speechService.speak(
        line.text,
        LanguageEnum.English,
        this.assignments.get(line.participantId),
      );

      if (requestId !== this.playRequestId) {
        return;
      }

      const duration = this.speechService.lastAudioDuration;

      if (duration > 0) {
        this.measuredChars += line.text.length;
        this.measuredSeconds += duration;
      }

      if (isSingleLine) {
        break;
      }
    }

    this.isPlaying = false;

    if (!isSingleLine) {
      this.lineIndex = this.lines.length;
      this.isFirstListenDone = true;
    }
  }

  private stopPlaying() {
    this.playRequestId++;
    this.isPlaying = false;
    this.speechService.stopSpeaking();
    this.stopProgressLoop();
    this.playedPercent = this.targetPercent();
  }

  private get charsPerSecond() {
    return this.measuredSeconds ? this.measuredChars / this.measuredSeconds : defaultCharsPerSecond;
  }

  private get lineSeconds() {
    const isMeasured =
      this.lineDurations.length === this.lines.length &&
      this.lineDurations.every((duration) => duration > 0);

    return isMeasured
      ? this.lineDurations
      : this.lines.map((line) => line.text.length / this.charsPerSecond);
  }

  private targetPercent() {
    const seconds = this.lineSeconds;
    const total = seconds.reduce((sum, value) => sum + value, 0);

    if (!total) {
      return 0;
    }

    const played = seconds.slice(0, this.lineIndex).reduce((sum, value) => sum + value, 0);
    const lineSeconds = seconds[this.lineIndex] ?? 0;
    let current = 0;

    if (this.isPlaying && lineSeconds) {
      const audioTime = this.speechService.audioTime;

      current =
        audioTime === null
          ? lineSeconds * this.speechService.utteranceFraction
          : Math.min(audioTime, lineSeconds);
    }

    return (100 * (played + current)) / total;
  }

  private startProgressLoop() {
    this.stopProgressLoop();

    let last = performance.now();

    const step = (now: number) => {
      const seconds = Math.min((now - last) / 1000, maxFrameSeconds);
      const target = this.targetPercent();

      last = now;

      if (!this.isPlaying && this.playedPercent >= target - 0.05) {
        this.progressFrame = 0;
        return;
      }

      const total = this.lineSeconds.reduce((sum, value) => sum + value, 0);
      const speed = total ? (100 * this.playbackRate) / total : 0;
      const velocity = Math.max(0, speed + progressCatchUpRate * (target - this.playedPercent));

      this.playedPercent = Math.min(this.playedPercent + velocity * seconds, 100);
      this.changeDetectorRef.detectChanges();
      this.progressFrame = requestAnimationFrame(step);
    };

    this.zone.runOutsideAngular(() => (this.progressFrame = requestAnimationFrame(step)));
  }

  private stopProgressLoop() {
    cancelAnimationFrame(this.progressFrame);
    this.progressFrame = 0;
  }

  private preloadLines(exercise: ListeningExercise) {
    const durations = exercise.lines.map(() => 0);

    this.lineDurations = durations;

    exercise.lines.forEach((line, index) =>
      this.speechService
        .preload(line.text, LanguageEnum.English, this.assignments.get(line.participantId))
        .then((duration) => (durations[index] = duration ?? 0)),
    );
  }

  private loadExercise() {
    this.stopPlaying();
    this.isBusy = true;
    this.error = '';
    this.exercise = null;
    this.assignments = new Map();
    this.lineIndex = 0;
    this.playedPercent = 0;
    this.lineDurations = [];
    this.isStarted = false;
    this.isFirstListenDone = false;
    this.isHelpShown = false;
    this.isReplayed = false;
    this.isTextShown = false;
    this.answers = [];
    this.results = [];
    this.shownTranslations = new Set();
    this.isUnavailable = false;

    this.loadSubscription?.unsubscribe();
    this.loadSubscription = this.apiService
      .getListeningExercise(this.translationLanguage)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (exercise) => {
          this.error = exercise.error ?? '';
          this.isUnavailable = !exercise.error && !exercise.lines.length;

          if (!exercise.lines.length) {
            return;
          }

          this.exercise = exercise;
          this.assignments = this.speechService.assignVoices(exercise.participants);
          this.answers = exercise.questions.map(() => null);
          this.results = exercise.questions.map(() => null);
          this.preloadLines(exercise);
          this.focusAfterRender(() => this.startButton?.nativeElement);
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
