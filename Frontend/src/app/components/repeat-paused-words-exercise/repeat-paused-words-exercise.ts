import { Component, ElementRef, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ExerciseCompletionsService } from '../../services/exercise-completions.service';
import { ExerciseTypeEnum } from '../../enums/exercise-type.enum';
import { ExerciseWordStatistic } from '../../models/exercise-word-statistic';
import { WordTranslationsExerciseModel } from '../../models/word-translations-exercise-model';
import { finalize, take } from 'rxjs/operators';
import { ExerciseWordResult } from '../../models/exercise-word-result';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { StaticConfigService } from '../../services/static.config.service';

import { FormsModule } from '@angular/forms';
import { ExerciseResultComponent } from '../exercise-result/exercise-result';
import { ExerciseUnavailableComponent } from '../exercise-unavailable/exercise-unavailable';
import { ProgressBarComponent } from '../../ui/progress-bar';
import { SvgIconComponent } from 'angular-svg-icon';
import { ImageComponent } from '../../ui/image';
import { StarComponent } from '../star/star';
import { HighlightWordPipe } from '../../pipes/highlightWord';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';
import { AutoFocusDirective } from '../../ui/auto-focus';

@Component({
  selector: 'app-repeat-paused-words-exercise',
  imports: [
    AutoFocusDirective,
    FormsModule,
    ProgressBarComponent,
    ImageComponent,
    SvgIconComponent,
    ExerciseResultComponent,
    ExerciseUnavailableComponent,
    StarComponent,
    HighlightWordPipe,
  ],
  templateUrl: './repeat-paused-words-exercise.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./repeat-paused-words-exercise.scss'],
})
export class RepeatPausedWordsExerciseComponent implements OnInit {
  @ViewChild('submitButton') submitButtonRef: ElementRef;

  tasks: WordTranslationsExerciseModel[] = [];
  exerciseWordStatistics: ExerciseWordStatistic[] = [];
  showAnswer = false;
  answersHistory: boolean[] = [];
  questionIndex = 0;
  isBusy = false;
  isUnavailable = false;

  constructor(
    public readonly staticConfigService: StaticConfigService,
    private readonly apiService: ApiService,
    private readonly exerciseCompletionsService: ExerciseCompletionsService,
    private readonly userStatisticsService: UserStatisticsService,
  ) {}

  ngOnInit() {
    this.startExercise();
  }

  onNext() {
    if (this.showAnswer) {
      this.questionIndex++;
      this.answersHistory.push(true);

      const task = this.tasks[this.questionIndex - 1];

      this.exerciseWordStatistics.push(
        new ExerciseWordStatistic(
          task.wordId,
          task.word,
          task.translations,
          task.pictureIds,
          task.usages,
          task.isAnyNewPictureAvailable,
          '',
          true,
          task.wordLearningProgress,
          false,
          task.reverted,
        ),
      );
      this.saveResult(task.wordId, true);
      this.markCompletedIfLast();

      const prevTask = this.tasks[this.questionIndex];
      if (prevTask?.reverted) {
        this.onPlayWordPronunciation(prevTask.wordId);
      }
    } else {
      const task = this.tasks[this.questionIndex];
      if (!task.reverted) {
        this.onPlayWordPronunciation(task.wordId);
      }
    }

    this.showAnswer = !this.showAnswer;
  }

  onDoNotKnow() {
    this.questionIndex++;
    this.answersHistory.push(false);
    this.showAnswer = !this.showAnswer;

    const task = this.tasks[this.questionIndex - 1];
    const wordLearningProgress =
      task.wordLearningProgress === WordLearningProgressEnum.Completed
        ? task.wordLearningProgress - 3
        : task.wordLearningProgress - 2;
    this.exerciseWordStatistics.push(
      new ExerciseWordStatistic(
        task.wordId,
        task.word,
        task.translations,
        task.pictureIds,
        task.usages,
        task.isAnyNewPictureAvailable,
        '',
        false,
        wordLearningProgress,
        false,
        task.reverted,
      ),
    );
    this.saveResult(task.wordId, false);
    this.markCompletedIfLast();
    this.submitButtonRef?.nativeElement.focus();
  }

  private markCompletedIfLast() {
    if (this.questionIndex === this.tasks.length) {
      this.exerciseCompletionsService.markCompleted(ExerciseTypeEnum.RepeatPausedWords);
    }
  }

  onRepeat() {
    this.startExercise();
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
    this.tasks = [];
    this.isUnavailable = false;
    this.isBusy = true;
    this.apiService
      .getRepeatPausedWordsExercise()
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (data) => {
          this.tasks = data;
          this.isUnavailable = !data.length;
          if (this.isUnavailable) {
            return;
          }
          for (const task of this.tasks) {
            if (Math.random() > 0.5) {
              const word = task.word;
              task.word = task.translations.join('; ');
              task.translations = [word];
              task.reverted = true;
            }
          }
          setTimeout(() => {
            this.submitButtonRef?.nativeElement.focus();
            if (this.tasks[0].reverted) {
              this.onPlayWordPronunciation(this.tasks[0].wordId);
            }
          });
        },
        error: (error) => {
          console.log(error);
        },
      });
  }

  private saveResult(wordId: number, isCorrect: boolean) {
    this.apiService
      .putRepeatPausedWordsExerciseResults([new ExerciseWordResult(wordId, isCorrect)])
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.userStatisticsService.refresh();
        },
        error: (error) => {
          console.log(error);
        },
      });
  }
}
