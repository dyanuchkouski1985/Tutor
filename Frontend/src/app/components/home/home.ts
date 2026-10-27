import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService } from '../../ui/dialog';
import { DynamicConfigService } from '../../services/dynamic.config.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { LanguageEnum } from '../../enums/language.enum';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import { Subscription } from 'rxjs';
import { WordTranslationsPage } from '../../models/wordTranslationsPage';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';
import { ExerciseAvailabilityFlag, UserStatistics } from '../../models/user-statistics';
import { StaticConfigService } from '../../services/static.config.service';
import { finalize, take } from 'rxjs/operators';
import { WordTranslationsFieldsConstants } from '../../constants/word-translations-fields.constants';
import { AppConstants } from '../../constants/app.constants';
import { WordTranslations } from '../../models/word-translations';
import { SoundService } from '../../services/sound.service';
import { CommonModule } from '@angular/common';
import { SvgIconComponent } from 'angular-svg-icon';
import { StarComponent } from '../star/star';
import { PopoverComponent } from '../../ui/popover';
import { TooltipDirective } from '../../ui/tooltip';
import { FormsModule } from '@angular/forms';
import { JoinPropertiesPipe } from '../../pipes/joinProperties';
import { ThemeSwitcher } from '../theme-switcher/theme-switcher';
import { LanguageLevelEnum } from '../../enums/language-level.enum';
import { MapPropertyPipe } from '../../pipes/mapProperty';
import { WordCardComponent } from '../word-card/word-card';
import { InViewDirective } from '../../directives/in-view';
import { ScrollTopComponent } from '../../ui/scroll-top';
import { AutoFocusDirective } from '../../ui/auto-focus';

@Component({
  selector: 'app-home',
  imports: [
    AutoFocusDirective,
    CommonModule,
    FormsModule,
    PopoverComponent,
    TooltipDirective,
    JoinPropertiesPipe,
    MapPropertyPipe,
    ThemeSwitcher,
    SvgIconComponent,
    StarComponent,
    WordCardComponent,
    InViewDirective,
    ScrollTopComponent,
  ],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./home.scss'],
})
export class HomeComponent {
  items: (WordTranslations | undefined)[] = [];
  itemsVersion = 0;
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
  languageLevelEnum = LanguageLevelEnum;
  languageLevels = Object.values(LanguageLevelEnum).filter(
    (value): value is LanguageLevelEnum => typeof value === 'number',
  );
  languageLevel: LanguageLevelEnum | null = null;
  pickedLanguageLevel: LanguageLevelEnum | null = null;
  languageLevelNames: Record<LanguageLevelEnum, string> = {
    [LanguageLevelEnum.A1]: 'Beginner',
    [LanguageLevelEnum.A2]: 'Elementary',
    [LanguageLevelEnum.B1]: 'Intermediate',
    [LanguageLevelEnum.B2]: 'Upper Int.',
    [LanguageLevelEnum.C1]: 'Advanced',
    [LanguageLevelEnum.C2]: 'Proficient',
  };
  wordIdToDelete: number | null = null;
  wordTranslations: WordTranslationsPage | null = null;
  userStatistics: UserStatistics | null = null;
  appConstants = AppConstants;
  wordTranslationsFieldsConstants = WordTranslationsFieldsConstants;
  eventDescriptions: string[] = [];
  sortField: string;
  sortOrder: number;
  sortOptions = [
    { field: WordTranslationsFieldsConstants.LAST_LEARNING_DATE, label: 'Learned' },
    { field: WordTranslationsFieldsConstants.ADDING_DATE, label: 'Added' },
    { field: WordTranslationsFieldsConstants.VALUE, label: 'Word' },
    { field: WordTranslationsFieldsConstants.WORD_LEARNING_PROGRESS, label: 'Progress' },
    { field: WordTranslationsFieldsConstants.PICTURES, label: 'Pictures' },
  ];
  pageSize = 100;
  itemsTotalCount = 0;
  isBusy = false;
  isSearchActive = false;
  isScrollingToTop = false;

  private subscriptions = new Subscription();
  private searchGeneration = 0;
  private loadedPages = new Set<number>();

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
    this.loadLanguageLevel();
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

    this.searchWords();
  }

  onSort(field: string) {
    if (field === this.sortField) {
      this.sortOrder = -this.sortOrder;
    } else {
      this.sortField = field;
      this.sortOrder = AppConstants.SORT_ORDER_UP;
    }

    this.searchWords();
  }

  onPlaceholderInView(index: number) {
    if (this.isScrollingToTop) {
      return;
    }

    const page = Math.floor(index / this.pageSize);

    if (!this.loadedPages.has(page)) {
      this.loadPage(page);
    }
  }

  onOpenWordTranslationsDialog(word = '') {
    this.dialogService.open(WordTranslationsDialogComponent, {
      header: 'Word',
      styleClass: 'word-translations-dialog',
      waitUntilReady: true,
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

  isExerciseUnavailable(flag: ExerciseAvailabilityFlag) {
    return this.userStatistics?.[flag] === false;
  }

  isExerciseStarted(route: string) {
    return this.dynamicConfigService.isExerciseStarted(route);
  }

  onStartTranslationsWordExercise() {
    if (!this.isExerciseUnavailable('isAvailableTranslationsWordExercise')) {
      this.startExercise('/translations-word-exercise');
    }
  }

  onStartRepeatPausedWordsExercise() {
    if (!this.isExerciseUnavailable('isAvailableRepeatPausedWordsExercise')) {
      this.startExercise('/repeat-paused-words-exercise');
    }
  }

  onStartTomorrowWords() {
    if (!this.isExerciseUnavailable('isAvailableTomorrowWords')) {
      this.startExercise('/tomorrow-words');
    }
  }

  onStartCrosswordExercise() {
    if (!this.isExerciseUnavailable('isAvailableCrosswordExercise')) {
      this.startExercise('/crossword-exercise');
    }
  }

  onStartSpeechExercise() {
    if (this.staticConfigService.enableSpeechExercise) {
      this.startExercise('/speech-exercise');
    }
  }

  onOpenMistakes() {
    if (this.staticConfigService.enableSpeechExercise) {
      this.startExercise('/mistakes');
    }
  }

  onStartSentenceTranslationExercise() {
    if (this.staticConfigService.enableSpeechExercise) {
      this.startExercise('/sentence-translation-exercise');
    }
  }

  onStartListeningExercise() {
    if (
      this.staticConfigService.enableSpeechExercise &&
      !this.isExerciseUnavailable('isAvailableListeningExercise')
    ) {
      this.startExercise('/listening-exercise');
    }
  }

  onStartCountabilityExercise() {
    if (
      this.staticConfigService.enableSpeechExercise &&
      !this.isExerciseUnavailable('isAvailableCountabilityExercise')
    ) {
      this.startExercise('/countability-exercise');
    }
  }

  onStartArticlesExercise() {
    if (
      this.staticConfigService.enableSpeechExercise &&
      !this.isExerciseUnavailable('isAvailableArticlesExercise')
    ) {
      this.startExercise('/articles-exercise');
    }
  }

  onStartVerbFormsExercise() {
    if (
      this.staticConfigService.enableSpeechExercise &&
      !this.isExerciseUnavailable('isAvailableVerbFormsExercise')
    ) {
      this.startExercise('/verb-forms-exercise');
    }
  }

  onStartGuessExercise() {
    if (
      this.staticConfigService.enableSpeechExercise &&
      !this.isExerciseUnavailable('isAvailableGuessExercise')
    ) {
      this.startExercise('/guess-exercise');
    }
  }

  onStartExplainExercise() {
    if (
      this.staticConfigService.enableSpeechExercise &&
      !this.isExerciseUnavailable('isAvailableExplainExercise')
    ) {
      this.startExercise('/explain-exercise');
    }
  }

  toggleLanguage() {
    this.clearSearch();
    this.dynamicConfigService.language = this.language =
      this.language === this.englishLanguage ? this.polishLanguage : this.englishLanguage;
    this.searchText = '';
    this.userStatisticsService.refresh();
    this.loadLanguageLevel();
  }

  languageLevelGroup(level: LanguageLevelEnum) {
    return level <= LanguageLevelEnum.A2 ? 'a' : level <= LanguageLevelEnum.B2 ? 'b' : 'c';
  }

  onSelectLanguageLevel(level: LanguageLevelEnum, panel: PopoverComponent) {
    if (this.pickedLanguageLevel !== null) {
      return;
    }

    this.pickedLanguageLevel = level;
    setTimeout(() => {
      panel.hide();
      this.pickedLanguageLevel = null;
    }, 300);

    if (level === this.languageLevel) {
      return;
    }

    this.apiService
      .putLanguageSetting(level)
      .pipe(take(1))
      .subscribe({
        next: (setting) => (this.languageLevel = setting.level),
        error: (error) => console.error(error.message),
      });
  }

  onSearchChange($event: any) {
    this.clearSearch();
  }

  onToggleSound() {
    this.dynamicConfigService.toggleSound();
  }

  private startExercise(route: string) {
    this.dynamicConfigService.markExerciseStarted(route);
    this.router.navigate([route]);
  }

  private loadLanguageLevel() {
    const language = this.language;
    this.languageLevel = null;

    this.apiService
      .getLanguageSetting()
      .pipe(take(1))
      .subscribe({
        next: (setting) => {
          if (language === this.language) {
            this.languageLevel = setting.level;
          }
        },
        error: (error) => console.error(error.message),
      });
  }

  private clearSearch() {
    this.searchGeneration++;
    this.wordTranslations = null;
    this.items = [];
    this.loadedPages.clear();
    this.isSearchActive = false;
    this.isBusy = false;
  }

  private searchWords() {
    const generation = ++this.searchGeneration;
    this.isBusy = true;

    this.fetchPage(0)
      .pipe(
        finalize(() => {
          if (generation === this.searchGeneration) {
            this.isBusy = false;
          }
        }),
      )
      .subscribe({
        next: (data) => {
          if (generation !== this.searchGeneration) {
            return;
          }

          this.wordTranslations = data;
          this.itemsTotalCount = data.itemsCount;
          this.loadedPages = new Set([0]);
          this.items = Array.from({ length: data.itemsCount }, (_, index) => data.items[index]);
          this.itemsVersion++;
          this.isSearchActive = true;
        },
        error: (error) => {
          console.error(error.message);
        },
      });
  }

  private loadPage(page: number) {
    const generation = this.searchGeneration;
    this.loadedPages.add(page);

    this.fetchPage(page).subscribe({
      next: (data) => {
        if (generation !== this.searchGeneration) {
          return;
        }

        const items = [...this.items];
        const offset = page * this.pageSize;

        data.items.forEach((item, index) => {
          if (offset + index < items.length) {
            items[offset + index] = item;
          }
        });

        this.items = items;
      },
      error: (error) => {
        this.loadedPages.delete(page);
        console.error(error.message);
      },
    });
  }

  private fetchPage(page: number) {
    return this.apiService
      .searchWordTranslations(
        this.searchText,
        this.sortField,
        this.sortOrder === AppConstants.SORT_ORDER_UP ? 'asc' : 'desc',
        page * this.pageSize,
        this.pageSize,
        this.searchFilterLearningProgresses,
      )
      .pipe(take(1));
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
