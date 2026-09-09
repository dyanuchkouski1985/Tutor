import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { StaticConfigService } from '../../services/static.config.service';
import { ExerciseWordStatistic } from '../../models/exercise-word-statistic';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import { Subscription } from 'rxjs';
import { DialogService } from 'primeng/dynamicdialog';
import { WordTranslations } from '../../models/word-translations';
import { ApiService } from '../../services/api.service';

import { SvgIconComponent } from 'angular-svg-icon';
import { TableModule } from 'primeng/table';
import { HighlightWordPipe } from '../../pipes/highlightWord';
import { StarComponent } from '../star/star';
import { ImageModule } from 'primeng/image';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-exercise-result',
  imports: [
    TableModule,
    ImageModule,
    ButtonModule,
    TooltipModule,
    RippleModule,
    HighlightWordPipe,
    SvgIconComponent,
    StarComponent
],
  templateUrl: './exercise-result.html',
  styleUrls: ['./exercise-result.scss'],
  providers: [DialogService],
})
export class ExerciseResultComponent implements OnInit, OnDestroy {
  @Output() repeatExerciseEvent = new EventEmitter();
  exerciseWordStatisticsValue: ExerciseWordStatistic[] = [];
  correctAnswers: number = 0;

  private subscriptions = new Subscription();

  @Input() showWrongAnswer = true;
  @Input() set exerciseWordStatistics(value: ExerciseWordStatistic[]) {
    this.exerciseWordStatisticsValue = value;
    this.correctAnswers = this.exerciseWordStatisticsValue.filter((s) => s.isCorrectAnswer).length;
  }
  get exerciseWordStatistics(): ExerciseWordStatistic[] {
    return this.exerciseWordStatisticsValue;
  }

  constructor(
    public readonly staticConfigService: StaticConfigService,
    private readonly router: Router,
    private readonly apiService: ApiService,
    private readonly dialogService: DialogService,
  ) {}

  ngOnInit() {
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
    this.repeatExerciseEvent.emit();
  }

  onHome() {
    this.router.navigate(['/']);
  }

  onOpenWordTranslationsDialog(exerciseWordStatistic: ExerciseWordStatistic) {
    this.dialogService.open(WordTranslationsDialogComponent, {
      header: 'Word',
      modal: true,
      dismissableMask: true,
      baseZIndex: 10000,
      showHeader: true,
      closable: true,
      closeOnEscape: true,
      styleClass: 'word-translations-dialog',
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
