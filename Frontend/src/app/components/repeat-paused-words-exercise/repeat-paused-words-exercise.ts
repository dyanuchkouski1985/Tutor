import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../../services/api.service';
import {ExerciseWordStatistic} from '../../models/exercise-word-statistic';
import {WordTranslationsExerciseModel} from '../../models/word-translations-exercise-model';
import {finalize, take} from 'rxjs/operators';
import {ExerciseWordResult} from '../../models/exercise-word-result';
import {UserStatisticsService} from '../../services/user-statistics.service';
import {StaticConfigService} from '../../services/static.config.service';

import {FormsModule} from '@angular/forms';
import {ExerciseResultComponent} from '../exercise-result/exercise-result';
import {ProgressBarModule} from 'primeng/progressbar';
import {SvgIconComponent} from 'angular-svg-icon';
import {ImageModule} from 'primeng/image';
import {StarComponent} from '../star/star';
import {ButtonModule} from 'primeng/button';
import {AutoFocusModule} from 'primeng/autofocus';
import {RippleModule} from 'primeng/ripple';
import {WordLearningProgressEnum} from '../../enums/word-learning-progress.enum';

@Component({
  selector: 'app-repeat-paused-words-exercise',
  imports: [
    FormsModule,
    ProgressBarModule,
    ImageModule,
    ButtonModule,
    AutoFocusModule,
    RippleModule,
    SvgIconComponent,
    ExerciseResultComponent,
    StarComponent
  ],
  templateUrl: './repeat-paused-words-exercise.html',
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

  constructor(
    public readonly staticConfigService: StaticConfigService,
    private readonly apiService: ApiService,
    private readonly userStatisticsService: UserStatisticsService,
  ) {
  }

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
    this.saveResults();
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
    this.saveResults();
    this.submitButtonRef?.nativeElement.focus();
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

  private saveResults() {
    if (this.questionIndex === this.tasks.length && !this.showAnswer) {
      const result: ExerciseWordResult[] = [];
      for (let i = 0; i < this.tasks.length; i++) {
        result.push(new ExerciseWordResult(this.tasks[i].wordId, this.answersHistory[i]));
      }
      this.apiService
        .putRepeatPausedWordsExerciseResults(result)
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
}
