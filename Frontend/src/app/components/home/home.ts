import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { DynamicConfigService } from '../../services/dynamic.config.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { LanguageEnum } from '../../enums/language.enum';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import { Subscription } from 'rxjs';
import { WordTranslationsPage } from '../../models/wordTranslationsPage';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';
import { UserStatistics } from '../../models/user-statistics';
import { StaticConfigService } from '../../services/static.config.service';
import { finalize, take } from 'rxjs/operators';
import { SortEvent } from 'primeng/api';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { WordTranslationsFieldsConstants } from '../../constants/word-translations-fields.constants';
import { AppConstants } from '../../constants/app.constants';
import { WordTranslations } from '../../models/word-translations';
import { SoundService } from '../../services/sound.service';
import { CommonModule } from '@angular/common';
import { SvgIconComponent } from 'angular-svg-icon';
import { StarComponent } from '../star/star';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { InputGroupModule } from 'primeng/inputgroup';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SkeletonModule } from 'primeng/skeleton';
import { ImageModule } from 'primeng/image';
import { FormsModule } from '@angular/forms';
import { JoinPropertiesPipe } from '../../pipes/joinProperties';
import { HighlightWordPipe } from '../../pipes/highlightWord';
import { ScrollTopModule } from 'primeng/scrolltop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AutoFocusModule } from 'primeng/autofocus';
import { ThemeSwitcher } from '../theme-switcher/theme-switcher';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-home',
  imports: [
    AutoFocusModule,
    CommonModule,
    FormsModule,
    PopoverModule,
    TooltipModule,
    InputGroupModule,
    FloatLabelModule,
    TableModule,
    SkeletonModule,
    ImageModule,
    ScrollTopModule,
    ButtonModule,
    InputTextModule,
    RippleModule,
    JoinPropertiesPipe,
    HighlightWordPipe,
    ThemeSwitcher,
    SvgIconComponent,
    StarComponent,
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
  providers: [DialogService],
})
export class HomeComponent {
  items: WordTranslations[] = [];
  searchText = '';
  searchFilterLearningProgresses = [
    WordLearningProgressEnum.Two,
    WordLearningProgressEnum.One,
    WordLearningProgressEnum.None,
  ];
  wordLearningProgressEnum = WordLearningProgressEnum;
  englishLanguage = LanguageEnum.English;
  polishLanguage = LanguageEnum.Polish;
  language: LanguageEnum = this.dynamicConfigService.language;
  wordIdToDelete: number | null = null;
  wordTranslations: WordTranslationsPage | null = null;
  userStatistics: UserStatistics | null = null;
  appConstants = AppConstants;
  wordTranslationsFieldsConstants = WordTranslationsFieldsConstants;
  eventDescriptions: string[] = [];
  sortField: string;
  sortOrder: number;
  lazyLoadPageSize = 1000;
  itemsTotalCount = 0;
  isBusy = false;
  isSearchActive = false;

  private subscriptions = new Subscription();
  private firstVisibleItemIndex = 0;
  private loadingItemIndex = 0;
  private loadingPageSize = this.lazyLoadPageSize;

  constructor(
    public readonly dynamicConfigService: DynamicConfigService,
    public readonly staticConfigService: StaticConfigService,
    private readonly dialogService: DialogService,
    private readonly authService: AuthService,
    private readonly apiService: ApiService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly soundService: SoundService,
    private readonly router: Router,
  ) {
    this.sortField = WordTranslationsFieldsConstants.LAST_LEARNING_DATE;
    this.sortOrder = AppConstants.SORT_ORDER_DOWN;

    this.userStatistics = this.userStatisticsService.get();
    this.subscriptions.add(
      this.userStatisticsService.userStatisticsObservable.subscribe((data) => {
        this.userStatistics = data;
      }),
    );
    this.initEventDescriptions();
  }

  onFilterClick(learningProgress: WordLearningProgressEnum) {
    if (this.searchFilterLearningProgresses.includes(learningProgress)) {
      this.searchFilterLearningProgresses = this.searchFilterLearningProgresses.filter(
        (p) => p !== learningProgress,
      );
    } else {
      this.searchFilterLearningProgresses.push(learningProgress);
    }

    this.clearSearch();
  }

  onConfirmDelete(event: Event, panel: any, wordId: number | null) {
    this.wordIdToDelete = wordId;
    panel.show(event);
  }

  onDeleteWord(panel: any) {
    if (!this.wordIdToDelete) {
      return;
    }

    this.isBusy = true;
    this.apiService
      .deleteWord(this.wordIdToDelete)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe((_) => {
        this.soundService.delete();
        this.userStatisticsService.refresh();
        this.searchWords();
      });

    panel.hide();
  }

  onSearchWords() {
    if (!this.searchFilterLearningProgresses.length) {
      return;
    }

    this.firstVisibleItemIndex = 0;
    this.loadingItemIndex = 0;
    this.loadingPageSize = this.lazyLoadPageSize;

    this.searchWords();
  }

  onSortTable(event: SortEvent) {
    this.sortField = event.field!;
    this.sortOrder = event.order!;

    this.firstVisibleItemIndex = 0;
    this.loadingItemIndex = 0;
    this.loadingPageSize = this.lazyLoadPageSize;
    this.searchWords();
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    const firstItemIndex = event.first!;
    if (
      firstItemIndex < 0 ||
      this.firstVisibleItemIndex === firstItemIndex ||
      (event.sortField &&
        (event.sortOrder !== this.sortOrder || event.sortField !== this.sortField))
    ) {
      return;
    }

    this.firstVisibleItemIndex = firstItemIndex;

    if (
      firstItemIndex === 0 ||
      (firstItemIndex > this.loadingItemIndex &&
        firstItemIndex <= this.loadingItemIndex + this.loadingPageSize)
    ) {
      this.loadingItemIndex = firstItemIndex;
      this.loadingPageSize = this.lazyLoadPageSize;
    } else {
      this.loadingItemIndex = firstItemIndex - this.lazyLoadPageSize;
      this.loadingPageSize = this.lazyLoadPageSize * 2;
    }

    this.searchWords();
  }

  onImagePreviewShow() {
    document.getElementById('image-backdrop')?.classList.add('active');
  }

  onImagePreviewHide() {
    document.getElementById('image-backdrop')?.classList.remove('active');
  }

  onOpenWordTranslationsDialog(word = '') {
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
        word: word,
        onWordSaved: this.onWordSaved.bind(this),
      },
    });
  }

  onPlayWordPronunciation(wordId: number) {
    const wordPronunciationAudio = new Audio();
    wordPronunciationAudio.src = this.apiService.getWordPronunciationUrl(wordId);
    wordPronunciationAudio.load();
    wordPronunciationAudio.play();
  }

  onWordSaved() {
    if (this.isSearchActive) {
      this.searchWords();
    }
  }

  onLogout() {
    this.authService.logout();
  }

  onStartTranslationsWordExercise() {
    this.router.navigate(['/translations-word-exercise']);
  }

  onStartRepeatPausedWordsExercise() {
    if (this.userStatistics?.isAvailableRepeatPausedWordsExercise) {
      this.router.navigate(['/repeat-paused-words-exercise']);
    }
  }

  onStartCrosswordExercise() {
    this.router.navigate(['/crossword-exercise']);
  }

  toggleLanguage() {
    this.clearSearch();
    this.dynamicConfigService.language = this.language =
      this.language === this.englishLanguage ? this.polishLanguage : this.englishLanguage;
    this.searchText = '';
    this.userStatisticsService.refresh();
  }

  onSearchChange($event: any) {
    this.clearSearch();
  }

  onToggleSound() {
    this.dynamicConfigService.toggleSound();
  }

  private clearSearch() {
    this.wordTranslations = null;
    this.isSearchActive = false;
  }

  private searchWords() {
    this.isBusy = true;
    this.apiService
      .searchWordTranslations(
        this.searchText,
        this.sortField,
        this.sortOrder === 1 ? 'asc' : 'desc',
        this.loadingItemIndex,
        this.loadingPageSize,
        this.searchFilterLearningProgresses,
      )
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (data) => {
          this.wordTranslations = data;

          if (this.wordTranslations.itemsCount !== this.itemsTotalCount) {
            this.itemsTotalCount = this.wordTranslations.itemsCount;
            this.items = Array.from({
              length: this.itemsTotalCount,
            });
          }

          const count = Math.min(
            this.wordTranslations.items.length,
            this.items.length - this.loadingItemIndex,
          );

          const items = this.wordTranslations.items.slice(0, count);
          if (count > 0) {
            this.items.splice(this.loadingItemIndex, count, ...items);
          }

          this.isSearchActive = true;
        },
        error: (error) => {
          console.error(error.message);
        },
      });
  }

  private initEventDescriptions() {
    const events = this.staticConfigService.events;
    for (const event of events) {
      const eventDate = new Date(event.date);
      const now = new Date();

      eventDate.setFullYear(now.getFullYear());
      now.setHours(0);
      now.setMinutes(0);
      now.setSeconds(0);
      now.setMilliseconds(0);

      if (now <= eventDate) {
        const diffTime = eventDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 10) {
          this.eventDescriptions.push(`${event.date}: ${event.description}`);
        }
      }
    }
  }
}
