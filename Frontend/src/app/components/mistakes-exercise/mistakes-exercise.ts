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
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SvgIconComponent } from 'angular-svg-icon';
import { ProgressBarComponent } from '../../ui/progress-bar';
import { TooltipDirective } from '../../ui/tooltip';
import { RoundprogressModule } from 'angular-svg-round-progressbar';
import { DialogService } from '../../ui/dialog';
import { finalize, take } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { ExerciseCompletionsService } from '../../services/exercise-completions.service';
import { ExerciseTypeEnum } from '../../enums/exercise-type.enum';
import { StaticConfigService } from '../../services/static.config.service';
import { SoundService } from '../../services/sound.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { SpeechService } from '../../services/speech.service';
import { DynamicConfigService } from '../../services/dynamic.config.service';
import { MistakeAnswer, MistakeTask, MistakeTaskResult } from '../../models/mistake-pattern';
import { MistakeProgressEnum } from '../../enums/mistake-progress.enum';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import { getTextBounds } from '../../core/text-selection';
import { mistakeProgressClass, mistakeProgressLabel } from '../../core/mistake-progress';
import { AutoFocusDirective } from '../../ui/auto-focus';

@Component({
  selector: 'app-mistakes-exercise',
  imports: [
    AutoFocusDirective,
    CommonModule,
    FormsModule,
    SvgIconComponent,
    ProgressBarComponent,
    TooltipDirective,
    RoundprogressModule,
  ],
  templateUrl: './mistakes-exercise.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./mistakes-exercise.scss'],
})
export class MistakesExerciseComponent implements OnInit, OnDestroy {
  @ViewChild('submitButton') submitButton: ElementRef<HTMLButtonElement>;
  @ViewChild('mistakesButton') mistakesButton: ElementRef<HTMLButtonElement>;

  tasks: MistakeTask[] = [];
  taskIndex = 0;
  answer = '';
  isHintShown = false;
  isGivenUp = false;
  result: MistakeAnswer | null = null;
  answersHistory: boolean[] = [];
  helpHistory: boolean[] = [];
  results: MistakeTaskResult[] = [];
  points = 0;
  masteredCount = 0;
  isBusy = false;
  isLoaded = false;
  error = '';
  isListening = false;
  interimText = '';
  remainingTime = 0;
  selectedText = '';
  selectionTop = 0;
  selectionLeft = 0;
  progressLabel = mistakeProgressLabel;
  progressClass = mistakeProgressClass;

  private answerBeforeListening = '';
  private spokenText = '';
  private listenSubscription: Subscription | null = null;
  private timerSubscription: Subscription | null = null;
  private isDestroyed = false;

  constructor(
    public readonly speechService: SpeechService,
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

  onOpenSelection() {
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

  ngOnDestroy() {
    this.isDestroyed = true;
    this.stopTimer();
    this.cancelListening();
    this.speechService.stopSpeaking();
  }

  onMicrophone() {
    if (this.isListening) {
      this.speechService.stopListening();
      return;
    }

    this.speechService.stopSpeaking();
    this.error = '';
    this.interimText = '';
    this.spokenText = '';
    this.answerBeforeListening = this.answer;
    this.isListening = true;

    this.listenSubscription = this.speechService
      .listen(this.dynamicConfigService.language)
      .subscribe({
        next: (result) => {
          this.interimText = result.transcript;

          if (!result.isFinal) {
            return;
          }

          this.spokenText = `${this.spokenText} ${result.transcript}`.trim();
          this.answer = this.spokenText;
          this.interimText = '';
        },
        error: (error) => {
          this.error = error.message;
          this.isListening = false;
          this.interimText = '';
        },
        complete: () => {
          this.isListening = false;
          this.interimText = '';
        },
      });
  }

  onCancelListening() {
    this.cancelListening();
    this.answer = this.answerBeforeListening;
  }

  onPlayCorrected() {
    if (this.result?.correctedSentence) {
      this.speechService.speak(this.result.correctedSentence, this.dynamicConfigService.language);
    }
  }

  private cancelListening() {
    this.listenSubscription?.unsubscribe();
    this.listenSubscription = null;
    this.speechService.stopListening();
    this.isListening = false;
    this.interimText = '';
  }

  ngOnInit() {
    if (!this.staticConfigService.enableSpeechExercise) {
      this.router.navigate(['/']);
      return;
    }

    this.loadExercise();
  }

  get task() {
    return this.tasks[this.taskIndex];
  }

  get isFinished() {
    return this.tasks.length > 0 && this.taskIndex >= this.tasks.length;
  }

  get sentenceParts() {
    return this.splitSentence(this.task.sentence, this.isHintShown ? this.task.fragment : '');
  }

  splitSentence(sentence: string, fragment: string) {
    const start = fragment ? sentence.indexOf(fragment) : -1;

    return start < 0
      ? { before: sentence, fragment: '', after: '' }
      : {
          before: sentence.slice(0, start),
          fragment: fragment,
          after: sentence.slice(start + fragment.length),
        };
  }

  onHint() {
    this.isHintShown = true;
    this.soundService.help();
  }

  onSubmit() {
    if (this.result) {
      this.onNext();
      return;
    }

    if (!this.answer.trim() || this.isBusy || this.isListening) {
      return;
    }

    this.stopTimer();
    this.isBusy = true;
    this.error = '';
    this.apiService
      .answerMistakeTask(this.task, this.answer, this.isHintShown)
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

          this.showResult(result, this.answer.trim());
        },
        error: (error) => {
          this.error = 'Could not check the answer. Try again.';
          console.error(error.message);
        },
      });
  }

  onDontKnow() {
    if (this.result || this.isBusy || this.isListening) {
      return;
    }

    this.stopTimer();
    this.isBusy = true;
    this.error = '';
    this.apiService
      .answerMistakeTask(this.task, '', this.isHintShown, true)
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

          this.isGivenUp = true;
          this.showResult(
            {
              ...result,
              correctedSentence: this.task.correctedSentence,
              explanation: this.task.explanation,
            },
            '',
          );
        },
        error: (error) => {
          this.error = 'Could not save the answer. Try again.';
          console.error(error.message);
        },
      });
  }

  private showResult(result: MistakeAnswer, answer: string) {
    this.result = result;
    this.answersHistory.push(result.isCorrect);
    this.helpHistory.push(this.isHintShown);
    this.results.push({
      sentence: this.task.sentence,
      fragment: this.task.fragment,
      answer: answer,
      correctedSentence: result.correctedSentence,
      points: result.points,
      isCorrect: result.isCorrect,
    });
    this.points += result.points;

    if (
      result.isCounted &&
      result.progress === MistakeProgressEnum.Mastered &&
      this.task.progress !== MistakeProgressEnum.Mastered
    ) {
      this.masteredCount++;
    }

    result.isCorrect ? this.soundService.correct() : this.soundService.error();
    this.userStatisticsService.refresh();
    afterNextRender(() => setTimeout(() => this.submitButton?.nativeElement.focus()), {
      injector: this.injector,
    });
  }

  onNext() {
    this.speechService.stopSpeaking();
    this.selectedText = '';
    this.taskIndex++;
    this.answer = this.task?.sentence ?? '';
    this.isHintShown = false;
    this.isGivenUp = false;
    this.result = null;
    this.error = '';

    if (this.isFinished) {
      this.exerciseCompletionsService.markCompleted(ExerciseTypeEnum.Mistakes);
      afterNextRender(() => setTimeout(() => this.mistakesButton?.nativeElement.focus()), {
        injector: this.injector,
      });
      this.answersHistory.every((isCorrect) => isCorrect)
        ? this.soundService.celebrate()
        : this.soundService.finish();
    } else {
      this.startTimer();
    }
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
      this.onTimeUp();
    }
  }

  private onTimeUp() {
    if (this.result || this.isBusy) {
      return;
    }

    if (this.isListening) {
      this.cancelListening();
    }

    if (!this.answer.trim()) {
      this.answer = this.task.sentence;
    }

    this.onSubmit();
  }

  get correctCount() {
    return this.answersHistory.filter((isCorrect) => isCorrect).length;
  }

  onMistakes() {
    this.router.navigate(['/mistakes']);
  }

  onHome() {
    this.router.navigate(['/']);
  }

  private loadExercise() {
    this.isBusy = true;
    this.apiService
      .getMistakesExercise()
      .pipe(
        take(1),
        finalize(() => {
          this.isBusy = false;
          this.isLoaded = true;
        }),
      )
      .subscribe({
        next: (exercise) => {
          this.error = exercise.error ?? '';
          this.tasks = exercise.tasks;
          this.answer = this.task?.sentence ?? '';
          this.startTimer();
        },
        error: (error) => {
          this.error = 'Could not load the exercise.';
          console.error(error.message);
        },
      });
  }
}
