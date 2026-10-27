import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { StaticConfigService } from '../../services/static.config.service';
import { DynamicConfigService } from '../../services/dynamic.config.service';
import { ApiService } from '../../services/api.service';
import { ExerciseCompletionsService } from '../../services/exercise-completions.service';
import { ExerciseTypeEnum } from '../../enums/exercise-type.enum';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { SoundService } from '../../services/sound.service';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';
import { WordTranslationsExerciseModel } from '../../models/word-translations-exercise-model';
import { ExerciseWordResult } from '../../models/exercise-word-result';
import { ExerciseWordStatistic } from '../../models/exercise-word-statistic';
import { CommonModule } from '@angular/common';
import { StarComponent } from '../star/star';
import { HighlightWordPipe } from '../../pipes/highlightWord';
import { RoundprogressModule } from 'angular-svg-round-progressbar';
import { ImageComponent } from '../../ui/image';
import { SvgIconComponent } from 'angular-svg-icon';
import { ExerciseResultComponent } from '../exercise-result/exercise-result';
import { ExerciseUnavailableComponent } from '../exercise-unavailable/exercise-unavailable';
import { LetterHintComponent } from '../letter-hint/letter-hint';
import { ProgressBarComponent } from '../../ui/progress-bar';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs/operators';
import { finalize } from 'rxjs/operators';
import { AutoFocusDirective } from '../../ui/auto-focus';

class NextOptions {
  doNotKnow: boolean = false;

  constructor(doNotKnow: boolean) {
    this.doNotKnow = doNotKnow;
  }
}

@Component({
  selector: 'app-translations-word-exercise',
  imports: [
    AutoFocusDirective,
    CommonModule,
    FormsModule,
    RoundprogressModule,
    ImageComponent,
    ProgressBarComponent,
    StarComponent,
    HighlightWordPipe,
    SvgIconComponent,
    ExerciseResultComponent,
    ExerciseUnavailableComponent,
    LetterHintComponent,
  ],
  templateUrl: './translations-word-exercise.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
  helpModeLetters: string[] = [];
  helpModeAnswer = '';
  isCorrectAnswer = false;
  answersHistory: boolean[] = [];
  helpHistory: boolean[] = [];
  remainingTime: number = this.staticConfigService.timerValueInSeconds;
  isBusy = false;
  isUnavailable = false;
  private timerSubscription: Subscription | null = null;
  private isDestroyed = false;

  @ViewChild('submitButton') submitButtonRef?: ElementRef;

  constructor(
    public readonly staticConfigService: StaticConfigService,
    public readonly dynamicConfigService: DynamicConfigService,
    private readonly apiService: ApiService,
    private readonly exerciseCompletionsService: ExerciseCompletionsService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly soundService: SoundService,
  ) {}

  get isSubmitDisabled(): boolean {
    return (
      !this.showAnswer &&
      ((!this.isHelpMode && !this.answer?.length) || (this.isHelpMode && !this.helpModeAnswer))
    );
  }

  ngOnInit() {
    this.startExercise();
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.unsubscribeTimer();
  }

  onNext(options: NextOptions | null = null) {
    options = options || new NextOptions(false);
    if (this.showAnswer) {
      this.answer = '';
      this.isHelpMode = false;
      this.helpModeLetters = [];
      this.helpModeAnswer = '';
      if (this.staticConfigService.enableTimer && this.questionIndex < this.tasks.length) {
        this.startTimer();
      }
      if (this.questionIndex == this.tasks.length) {
        this.exerciseCompletionsService.markCompleted(ExerciseTypeEnum.TranslationsWord);
        this.exerciseWordStatistics.every((ews) => ews.isCorrectAnswer)
          ? this.soundService.celebrate()
          : this.soundService.finish();
      }
    } else {
      this.answer = this.isHelpMode ? this.helpModeAnswer : this.answer.trim();
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

      this.apiService
        .putExerciseResults([
          new ExerciseWordResult(task.wordId, this.isCorrectAnswer, this.isHelpMode),
        ])
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.userStatisticsService.refresh();
          },
          error: (error) => {
            console.log(error);
          },
        });

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

    this.showAnswer = !this.showAnswer;
  }

  onDoNotKnow() {
    this.onNext(new NextOptions(true));
  }

  onHelp() {
    this.isHelpMode = true;
    this.answer = '';
    this.helpModeAnswer = '';
    this.helpModeLetters = [...this.tasks[this.questionIndex].word];
    this.soundService.help();
  }

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
    this.isUnavailable = false;
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
          this.isUnavailable = !data.length;
          if (this.staticConfigService.enableTimer && !this.isUnavailable) {
            this.startTimer();
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

  private startTimer() {
    if (this.isDestroyed) {
      return;
    }

    this.timerSubscription = timer(0, 1000).subscribe(this.onTimer.bind(this));
  }

  private unsubscribeTimer() {
    if (this.timerSubscription) {
      this.soundService.clockTickingReset();
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  onRepeat() {
    this.startExercise();
  }
}
