import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize, take } from 'rxjs/operators';
import { SvgIconComponent } from 'angular-svg-icon';
import { ApiService } from '../../services/api.service';
import { StaticConfigService } from '../../services/static.config.service';
import { WordTranslationsExerciseModel } from '../../models/word-translations-exercise-model';
import { StarComponent } from '../star/star';
import { ImageComponent } from '../../ui/image';
import { ProgressBarComponent } from '../../ui/progress-bar';
import { HighlightWordPipe } from '../../pipes/highlightWord';
import { WordCardComponent } from '../word-card/word-card';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import { DialogService } from '../../ui/dialog';
import { WordTranslations } from '../../models/word-translations';

@Component({
  selector: 'app-tomorrow-words',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    SvgIconComponent,
    StarComponent,
    ImageComponent,
    ProgressBarComponent,
    HighlightWordPipe,
    WordCardComponent,
  ],
  templateUrl: './tomorrow-words.html',
  styleUrls: ['./tomorrow-words.scss'],
})
export class TomorrowWordsComponent implements OnInit, OnDestroy {
  words: WordTranslationsExerciseModel[] = [];
  index = 0;
  isRevealed = false;
  isFinished = false;
  isBusy = false;
  error = '';

  private readonly audio = new Audio();
  private loadSubscription: Subscription | null = null;

  constructor(
    private readonly apiService: ApiService,
    readonly staticConfigService: StaticConfigService,
    private readonly router: Router,
    private readonly dialogService: DialogService,
  ) {}

  get word() {
    return this.words[this.index] ?? null;
  }

  get progressPercent() {
    return this.words.length ? (100 * this.index) / this.words.length : 0;
  }

  ngOnInit() {
    this.load();
  }

  ngOnDestroy() {
    this.loadSubscription?.unsubscribe();
    this.audio.pause();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: Event) {
    if (this.isFinished || !this.word || (event.target as HTMLElement).closest('button')) {
      return;
    }

    if (this.isRevealed) {
      this.onNext();
    } else {
      this.onReveal();
    }
  }

  onReveal() {
    this.isRevealed = true;
  }

  onNext() {
    if (this.index < this.words.length - 1) {
      this.index++;
      this.isRevealed = false;
      this.onPlay();
    } else {
      this.index = this.words.length;
      this.isFinished = true;
    }
  }

  onPlay() {
    if (this.word) {
      this.onPlayWord(this.word);
    }
  }

  onPlayWord(word: WordTranslationsExerciseModel) {
    this.audio.src = this.apiService.getWordPronunciationUrl(word.wordId);
    this.audio.play().catch(() => {});
  }

  onOpenWordTranslationsDialog(word: WordTranslationsExerciseModel) {
    this.dialogService.open(WordTranslationsDialogComponent, {
      header: 'Word',
      styleClass: 'word-translations-dialog',
      waitUntilReady: true,
      data: {
        word: word.word,
        onWordSaved: (wordTranslations: WordTranslations) =>
          this.onWordSaved(word, wordTranslations),
      },
    });
  }

  onRepeat() {
    this.load();
  }

  onHome() {
    this.router.navigate(['/']);
  }

  private onWordSaved(word: WordTranslationsExerciseModel, wordTranslations: WordTranslations) {
    word.translations = wordTranslations.translations.filter((t) => t.enabled).map((t) => t.value);
    word.usages = wordTranslations.usages.filter((u) => u.enabled).map((u) => u.value);
    word.pictureIds = wordTranslations.pictures.filter((p) => p.enabled).map((p) => p.id);
    word.wordLearningProgress = wordTranslations.wordLearningProgress;
    word.isAnyNewPictureAvailable = wordTranslations.isAnyNewPictureAvailable;
  }

  private load() {
    this.isBusy = true;
    this.error = '';
    this.words = [];
    this.index = 0;
    this.isRevealed = false;
    this.isFinished = false;

    this.loadSubscription?.unsubscribe();
    this.loadSubscription = this.apiService
      .getTomorrowWords()
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (words) => {
          this.words = words;
          this.onPlay();
        },
        error: (error) => {
          this.error = 'Could not load the words.';
          console.error(error.message);
        },
      });
  }
}
