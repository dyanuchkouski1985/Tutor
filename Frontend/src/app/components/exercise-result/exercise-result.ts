import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { ExerciseWordStatistic } from '../../models/exercise-word-statistic';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import { Subscription } from 'rxjs';
import { DialogService } from '../../ui/dialog';
import { WordTranslations } from '../../models/word-translations';
import { ApiService } from '../../services/api.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { CelebrationService } from '../../services/celebration.service';
import { ExerciseAvailabilityFlag, UserStatistics } from '../../models/user-statistics';

import { SvgIconComponent } from 'angular-svg-icon';
import { WordCardComponent } from '../word-card/word-card';

@Component({
  selector: 'app-exercise-result',
  imports: [SvgIconComponent, WordCardComponent],
  templateUrl: './exercise-result.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./exercise-result.scss'],
})
export class ExerciseResultComponent implements OnInit, OnDestroy {
  @Output() repeatExerciseEvent = new EventEmitter();
  exerciseWordStatisticsValue: ExerciseWordStatistic[] = [];
  correctAnswers: number = 0;
  canRepeat = true;

  private subscriptions = new Subscription();

  @Input() showWrongAnswer = true;
  @Input() availabilityFlag: ExerciseAvailabilityFlag | null = null;
  @Input() set exerciseWordStatistics(value: ExerciseWordStatistic[]) {
    this.exerciseWordStatisticsValue = value;
    this.correctAnswers = this.exerciseWordStatisticsValue.filter((s) => s.isCorrectAnswer).length;
  }
  get exerciseWordStatistics(): ExerciseWordStatistic[] {
    return this.exerciseWordStatisticsValue;
  }

  constructor(
    private readonly router: Router,
    private readonly apiService: ApiService,
    private readonly dialogService: DialogService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly celebrationService: CelebrationService,
  ) {}

  ngOnInit() {
    this.celebrationService.nudge();
    this.updateCanRepeat(this.userStatisticsService.get());
    this.subscriptions.add(
      this.userStatisticsService.userStatisticsObservable.subscribe((userStatistics) =>
        this.updateCanRepeat(userStatistics),
      ),
    );
    this.userStatisticsService.refresh();

    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
    setTimeout(() => {
      const element = document.querySelector('button[type="submit"]') as any;
      element.focus({
        preventScroll: true,
      });
    }, 0);
  }

  onRepeat() {
    if (this.canRepeat) {
      this.repeatExerciseEvent.emit();
    }
  }

  private updateCanRepeat(userStatistics: UserStatistics) {
    this.canRepeat = !this.availabilityFlag || userStatistics[this.availabilityFlag] !== false;
  }

  onHome() {
    this.router.navigate(['/']);
  }

  onOpenWordTranslationsDialog(exerciseWordStatistic: ExerciseWordStatistic) {
    this.dialogService.open(WordTranslationsDialogComponent, {
      header: 'Word',
      styleClass: 'word-translations-dialog',
      waitUntilReady: true,
      data: {
        word: exerciseWordStatistic.reverted
          ? exerciseWordStatistic.translations[0]
          : exerciseWordStatistic.word,
        onWordSaved: this.onWordSaved.bind(this),
      },
    });
  }

  onWordSaved(wordTranslations: WordTranslations) {
    const wordStatistic = this.exerciseWordStatistics.find(
      (ews) => wordTranslations.value === (ews.reverted ? ews.translations[0] : ews.word),
    );
    if (wordStatistic) {
      if (wordStatistic.reverted) {
        wordStatistic.word = wordTranslations.translations
          .filter((t) => t.enabled)
          .map((t) => t.value)
          .join('; ');
      } else {
        wordStatistic.translations = wordTranslations.translations
          .filter((t) => t.enabled)
          .map((t) => t.value);
      }
      wordStatistic.usages = wordTranslations.usages.filter((u) => u.enabled).map((u) => u.value);
      wordStatistic.pictureIds = wordTranslations.pictures
        .filter((t) => t.enabled)
        .map((t) => t.id);
      wordStatistic.wordLearningProgress = wordTranslations.wordLearningProgress;
      wordStatistic.isAnyNewPictureAvailable = wordTranslations.isAnyNewPictureAvailable;
    }
  }

  onPlayWordPronunciation(wordId: number) {
    const wordPronunciationAudio = new Audio();
    wordPronunciationAudio.src = this.apiService.getWordPronunciationUrl(wordId);
    wordPronunciationAudio.load();
    wordPronunciationAudio.play();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
