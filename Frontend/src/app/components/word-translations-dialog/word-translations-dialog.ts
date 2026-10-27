import {
  afterNextRender,
  Component,
  Injector,
  OnInit,
  Optional,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Suggestion, WordSuggestions, WordSuggestionsResult } from '../../models/word-suggestions';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map, take } from 'rxjs/operators';
import { WordTranslations } from '../../models/word-translations';
import { Translation } from '../../models/translation';
import { Usage } from '../../models/usage';
import { Picture } from '../../models/picture';
import { StaticConfigService } from '../../services/static.config.service';
import { DynamicConfigService } from '../../services/dynamic.config.service';
import { TranslationLanguageEnum } from '../../enums/translation-language.enum';
import { LanguageEnum } from '../../enums/language.enum';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { SoundService } from '../../services/sound.service';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';
import { DialogConfig, DialogRef } from '../../ui/dialog';
import { AutocompleteComponent, AutocompleteCompleteEvent } from '../../ui/autocomplete';
import { PickListComponent, PickListMoveEvent } from '../../ui/pick-list';
import { CommonModule } from '@angular/common';
import { StarComponent } from '../star/star';
import { FormsModule } from '@angular/forms';
import { SvgIconComponent } from 'angular-svg-icon';
import { FileDropComponent } from '../../ui/file-drop';
import { ImageComponent } from '../../ui/image';
import { ToastComponent, ToastService } from '../../ui/toast';
import { PopoverComponent } from '../../ui/popover';
import { SelectButtonComponent } from '../../ui/select-button';
import { TooltipDirective } from '../../ui/tooltip';
import { AutoFocusDirective } from '../../ui/auto-focus';

@Component({
  selector: 'app-word-translations-dialog',
  imports: [
    AutoFocusDirective,
    CommonModule,
    AutocompleteComponent,
    FormsModule,
    PickListComponent,
    FileDropComponent,
    ImageComponent,
    ToastComponent,
    PopoverComponent,
    SelectButtonComponent,
    TooltipDirective,
    SvgIconComponent,
    StarComponent,
  ],
  templateUrl: './word-translations-dialog.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./word-translations-dialog.scss'],
})
export class WordTranslationsDialogComponent implements OnInit {
  @ViewChild('panelEditLearningProgress') panelEditLearningProgress: any;
  @ViewChild('panelUploadWordPronunciation') panelUploadWordPronunciation: any;
  @ViewChild('panelNewTranslation') panelNewTranslation: any;
  @ViewChild('panelNewUsage') panelNewUsage: any;

  suggestions: Suggestion[] = [];
  word: '';
  wordPronunciation: File | null = null;
  newTranslation = '';
  newUsage = '';
  wordTranslations: WordTranslations | null = null;
  myTranslations: Translation[] = [];
  othersTranslations: Translation[] = [];
  editingTranslation: Translation;
  editingTranslationValue = '';
  editingUsage: Usage;
  editingUsageValue = '';
  myUsages: Usage[] = [];
  othersUsages: Usage[] = [];
  isNewWord = true;
  isBusy = false;
  isSuggesting = false;
  wordLearningProgressEnum = WordLearningProgressEnum;
  translationLanguageOptions = [
    { label: 'RU', value: TranslationLanguageEnum.Russian },
    { label: 'PL', value: TranslationLanguageEnum.Polish },
    { label: 'EN', value: TranslationLanguageEnum.English },
  ];
  initialLearningProgress: WordLearningProgressEnum;
  availableWordLearningProgresses: WordLearningProgressEnum[] = [];
  flipLearningProgressIcon = false;
  flipPronunciationIcon = false;

  private allSuggestions: WordSuggestions;
  private wordPronunciationAudio = new Audio();
  private onWordSaved: any;

  constructor(
    public readonly staticConfigService: StaticConfigService,
    public readonly dynamicConfigService: DynamicConfigService,
    private config: DialogConfig,
    private readonly apiService: ApiService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly soundService: SoundService,
    private readonly toastService: ToastService,
    private readonly injector: Injector,
    @Optional() private readonly dialogRef: DialogRef | null,
  ) {}

  ngOnInit() {
    const learnedLanguage =
      this.dynamicConfigService.language === LanguageEnum.Polish
        ? TranslationLanguageEnum.Polish
        : TranslationLanguageEnum.English;

    this.translationLanguageOptions = this.translationLanguageOptions.filter(
      (option) => option.value !== learnedLanguage,
    );

    if (this.dynamicConfigService.translationLanguage === learnedLanguage) {
      this.dynamicConfigService.translationLanguage = TranslationLanguageEnum.Russian;
    }

    if (this.config?.data) {
      this.word = this.config.data.word;
      this.onWordSaved = this.config.data.onWordSaved;
      if (this.word) {
        this.onCheckNewWord(true);
      }
    }

    if (!this.word) {
      this.revealDialog();
    }

    this.getSuggestions();
  }

  onClear() {
    this.suggestions = [];
    this.wordTranslations = null;
    this.wordPronunciation = null;
    this.isNewWord = true;
  }

  setLearningProgress(learningProgress: WordLearningProgressEnum) {
    if (!this.wordTranslations) {
      return;
    }

    this.wordTranslations.wordLearningProgress = learningProgress;
    this.panelEditLearningProgress.hide();

    this.flipLearningProgressIcon = false;
    setTimeout(() => {
      this.flipLearningProgressIcon = true;
    });
  }

  setUserUpload(userUpload: boolean) {
    if (this.wordTranslations) {
      this.wordTranslations.userUpload = userUpload;
    }
  }

  onComplete(event: AutocompleteCompleteEvent) {
    this.suggestions = [];
    this.wordTranslations = null;
    this.wordPronunciation = null;
    this.isNewWord = true;
    const query = event.query.toLowerCase();
    if (!query.length) {
      return;
    }

    if (this.allSuggestions[query[0]]) {
      this.suggestions = this.allSuggestions[query[0]].filter((s) =>
        s.value.toLowerCase().startsWith(query),
      );
    }

    const suggestion =
      this.suggestions.find((s) => s.value.toLowerCase() === query) ?? new Suggestion();
  }

  onPronunciationDropped(event: any) {
    const file = event.files[0];
    if (file.type.startsWith('audio/')) {
      this.wordPronunciation = file;
      this.wordPronunciationAudio.src = URL.createObjectURL(file);
      this.wordPronunciationAudio.load();
      this.wordPronunciationAudio.play();
      this.panelUploadWordPronunciation.hide();
      this.flipPronunciationIcon = false;
      setTimeout(() => {
        this.flipPronunciationIcon = true;
      });
    } else {
      this.toastService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Only audio format is supported.',
        life: 3000,
      });
    }
  }

  onPlayWordPronunciation() {
    if (!this.wordPronunciationAudio) {
      return;
    }

    this.wordPronunciationAudio.play();
  }

  onCheckNewWord(isInitialLoad = false) {
    setTimeout(() => {
      this.isBusy = true;
    });

    this.apiService
      .getWordTranslations(this.word)
      .pipe(
        take(1),
        finalize(() => {
          this.isBusy = false;
          if (isInitialLoad) {
            this.revealDialog();
          }
        }),
      )
      .subscribe((data) => {
        this.wordTranslations = data;
        this.isNewWord =
          this.wordTranslations?.translations.every((t) => !t.userTranslationId) === true;
        this.wordTranslations.userUpload = !this.isNewWord;
        this.flipLearningProgressIcon = false;
        this.flipPronunciationIcon = false;
        this.myTranslations = this.wordTranslations.translations.filter(
          (t) => !!t.userTranslationId,
        );
        this.othersTranslations = this.wordTranslations.translations.filter(
          (t) => !t.userTranslationId,
        );
        this.myUsages = this.wordTranslations.usages.filter((u) => !!u.userUsageId);
        this.othersUsages = this.wordTranslations.usages.filter((u) => !u.userUsageId);

        this.initialLearningProgress = this.wordTranslations.wordLearningProgress;
        this.calculateAvailableWordLearningProgresses();

        if (this.wordTranslations.hasPronunciation) {
          this.wordPronunciationAudio.src = this.apiService.getWordPronunciationUrl(
            this.wordTranslations.id,
          );
          this.wordPronunciationAudio.load();
          this.wordPronunciationAudio.play();
        }
      });
  }

  private revealDialog() {
    afterNextRender(() => this.dialogRef?.ready(), { injector: this.injector });
  }

  onShowEditProgressPanel(event: any) {
    if (this.initialLearningProgress !== WordLearningProgressEnum.None) {
      this.panelEditLearningProgress.toggle(event);
    }
  }

  onShowEditTranslationPanel(panelEditTranslation: any, translation: Translation, event: any) {
    this.editingTranslation = translation;
    this.editingTranslationValue = translation.value;
    panelEditTranslation.show(event);
  }

  onEditTranslationCompleted(panelEditTranslation: any) {
    this.editingTranslationValue = this.editingTranslationValue.trim();
    if (!this.editingTranslationValue.length) {
      this.toastService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'At least one none space symbol should be used.',
        life: 3000,
      });
      return;
    }

    this.editingTranslation.value = this.editingTranslationValue;
    this.editingTranslationValue = '';
    panelEditTranslation.hide();
  }

  onShowEditUsagePanel(panelEditUsage: any, usage: Usage, event: any) {
    this.editingUsage = usage;
    this.editingUsageValue = usage.value;
    panelEditUsage.show(event);
  }

  onEditUsageCompleted(panelEditUsage: any) {
    this.editingUsageValue = this.editingUsageValue.trim();
    if (!this.editingUsageValue.length) {
      this.toastService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'At least one none space symbol should be used.',
        life: 3000,
      });
      return;
    }

    this.editingUsage.value = this.editingUsageValue;
    this.editingUsageValue = '';
    panelEditUsage.hide();
  }

  onSuggestTranslations() {
    this.runSuggestions(() => [this.suggestTranslations()]);
  }

  onSuggestUsages() {
    this.runSuggestions(() => [this.suggestUsages()]);
  }

  onSuggestAll() {
    this.runSuggestions(() => [this.suggestTranslations(), this.suggestUsages()]);
  }

  private runSuggestions(build: () => Observable<() => boolean>[]) {
    if (!this.word || !this.wordTranslations || this.isBusy) {
      return;
    }

    this.isBusy = true;
    this.isSuggesting = true;

    forkJoin(build())
      .pipe(
        finalize(() => {
          this.isBusy = false;
          this.isSuggesting = false;
        }),
      )
      .subscribe((applies) => {
        const added = applies.map((apply) => apply());

        if (added.some(Boolean)) {
          this.soundService.correct();
        }
      });
  }

  private suggestTranslations() {
    const existing = [...this.myTranslations, ...this.othersTranslations].map(
      (translation) => translation.value,
    );

    return this.suggest(
      this.apiService.suggestWordTranslations(this.word, existing),
      existing,
      'translations',
      (value, position) => {
        const translation = new Translation(0, 0, false, position, value);

        this.wordTranslations?.translations.push(translation);
        this.othersTranslations = [...this.othersTranslations, translation];
      },
    );
  }

  private suggestUsages() {
    const existing = [...this.myUsages, ...this.othersUsages].map((usage) => usage.value);

    return this.suggest(
      this.apiService.suggestWordUsages(this.word, existing),
      existing,
      'usages',
      (value, position) => {
        const usage = new Usage(0, 0, false, position, value);

        this.wordTranslations?.usages.push(usage);
        this.othersUsages = [...this.othersUsages, usage];
      },
    );
  }

  private suggest(
    request: Observable<WordSuggestionsResult>,
    existing: string[],
    label: string,
    add: (value: string, position: number) => void,
  ): Observable<() => boolean> {
    return request.pipe(
      take(1),
      catchError((error) => of({ items: [], error: error.message } as WordSuggestionsResult)),
      map((result) => () => this.applySuggestions(result, existing, label, add)),
    );
  }

  private applySuggestions(
    result: WordSuggestionsResult,
    existing: string[],
    label: string,
    add: (value: string, position: number) => void,
  ) {
    if (result.error) {
      this.toastService.add({
        severity: 'error',
        summary: 'Error',
        detail: result.error,
        life: 5000,
      });
      return false;
    }

    const suggested = result.items ?? [];

    if (!suggested.length) {
      this.toastService.add({
        severity: 'error',
        summary: 'Nothing suggested',
        detail: `The language model had no ${label} to suggest for '${this.word}'.`,
        life: 3000,
      });
      return false;
    }

    const known = new Set(existing.map((item) => item.toLowerCase()));
    const items = suggested.filter((item) => !known.has(item.toLowerCase()));

    if (!items.length) {
      this.toastService.add({
        severity: 'error',
        summary: 'Nothing new',
        detail: `No ${label} beyond what you already have.`,
        life: 3000,
      });
      return false;
    }

    items.forEach((item, index) => add(item, index));
    return true;
  }

  onAddNewTranslation() {
    this.newTranslation = this.newTranslation.trim();
    if (!this.newTranslation.length) {
      this.toastService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'At least one none space symbol should be used.',
        life: 3000,
      });
      return;
    }

    if (
      this.wordTranslations?.translations.some(
        (t) => t.value.toLowerCase() === this.newTranslation.toLowerCase(),
      )
    ) {
      this.toastService.add({
        severity: 'error',
        summary: 'Duplicated',
        detail: `Translation '${this.newTranslation}' already exists`,
        life: 3000,
      });
      return;
    }

    const translation = new Translation(
      0,
      0,
      true,
      this.myTranslations.length,
      this.newTranslation,
    );
    this.wordTranslations?.translations.push(translation);
    this.myTranslations = [...this.myTranslations, translation];
    this.newTranslation = '';
    this.panelNewTranslation.hide();
  }

  onAddNewUsage() {
    this.newUsage = this.newUsage.trim();
    if (!this.newUsage.length) {
      this.toastService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'At least one none space symbol should be used.',
        life: 3000,
      });
      return;
    }

    if (
      this.wordTranslations?.usages.some(
        (u) => u.value.toLowerCase() === this.newUsage.toLowerCase(),
      )
    ) {
      this.toastService.add({
        severity: 'error',
        summary: 'Duplicated',
        detail: `Usage '${this.newUsage}' already exists`,
        life: 3000,
      });
      return;
    }

    const usage = new Usage(0, 0, true, this.myUsages.length, this.newUsage);
    this.wordTranslations?.usages.push(usage);
    this.myUsages = [...this.myUsages, usage];
    this.newUsage = '';
    this.panelNewUsage.hide();
  }

  onMoveToTarget(event: PickListMoveEvent<Translation>) {
    if (!this.myTranslations.some((t) => t.id === event.items[0].id)) {
      this.myTranslations = [...this.myTranslations, ...event.items];
    }

    this.othersTranslations = this.othersTranslations.filter((i) => !event.items.includes(i));
  }

  onMoveToSource(event: PickListMoveEvent<Translation>) {
    if (!this.othersTranslations.some((t) => t.id === event.items[0].id)) {
      this.othersTranslations = [...this.othersTranslations, ...event.items];
    }

    this.myTranslations = this.myTranslations.filter((i) => !event.items.includes(i));
  }

  onNewTranslationOverlayHide() {
    this.newTranslation = '';
  }

  onNewUsageOverlayHide() {
    this.newUsage = '';
  }

  onPictureDropped(event: any) {
    const picture = event.files[0];
    if (picture.type.startsWith('image/')) {
      this.wordTranslations?.pictures.push(
        new Picture(
          0,
          0,
          URL.createObjectURL(picture),
          true,
          this.wordTranslations?.pictures.length,
          picture,
        ),
      );
    } else {
      this.toastService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Only image format is supported.',
        life: 3000,
      });
    }
  }

  onUpPicture(index: number) {
    const previousPicture = this.wordTranslations!.pictures[index - 1];
    const currentPicture = this.wordTranslations!.pictures[index];
    Picture.swap(previousPicture, currentPicture);
  }

  onDownPicture(index: number) {
    const currentPicture = this.wordTranslations!.pictures[index];
    const nextPicture = this.wordTranslations!.pictures[index + 1];
    Picture.swap(currentPicture, nextPicture);
  }

  onSave() {
    if (!this.wordTranslations) {
      return;
    }

    if (!this.myTranslations.length) {
      this.toastService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'At least one translation should be added.',
        life: 3000,
      });
      return;
    }

    for (let i = 0; i < this.myTranslations.length; i++) {
      this.myTranslations[i].position = i;
      this.myTranslations[i].enabled = true;
    }
    for (let i = 0; i < this.othersTranslations.length; i++) {
      this.othersTranslations[i].position = i;
      this.othersTranslations[i].enabled = false;
    }
    this.wordTranslations.translations = this.myTranslations;

    for (let i = 0; i < this.myUsages.length; i++) {
      this.myUsages[i].position = i;
      this.myUsages[i].enabled = true;
    }
    for (let i = 0; i < this.othersUsages.length; i++) {
      this.othersUsages[i].position = i;
      this.othersUsages[i].enabled = false;
    }
    this.wordTranslations.usages = this.myUsages;

    this.wordTranslations.pictures = this.wordTranslations.pictures.filter(
      (p) => p.id || p.enabled,
    );
    this.wordTranslations.pronunciation = this.wordPronunciation;

    const unsavedTranslations = this.othersTranslations.filter((t) => !t.id);
    const unsavedUsages = this.othersUsages.filter((u) => !u.id);

    this.isBusy = true;
    this.apiService
      .putWordTranslations(this.wordTranslations)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (data) => {
          this.wordTranslations = data;
          this.userStatisticsService.refresh();
          this.soundService.correct();

          if (!this.wordTranslations) {
            return;
          }
          this.onWordSaved?.(this.wordTranslations);

          this.flipLearningProgressIcon = this.isNewWord;
          this.flipPronunciationIcon = this.isNewWord;

          this.isNewWord =
            this.wordTranslations.translations.every((t) => !t.userTranslationId) === true;
          this.wordTranslations.userUpload = !this.isNewWord;
          this.wordTranslations.translations.push(
            ...this.notReturned(unsavedTranslations, this.wordTranslations.translations),
          );
          this.wordTranslations.usages.push(
            ...this.notReturned(unsavedUsages, this.wordTranslations.usages),
          );
          this.myTranslations = this.wordTranslations.translations.filter(
            (t) => !!t.userTranslationId,
          );
          this.othersTranslations = this.wordTranslations.translations.filter(
            (t) => !t.userTranslationId,
          );
          this.myUsages = this.wordTranslations.usages.filter((u) => !!u.userUsageId);
          this.othersUsages = this.wordTranslations.usages.filter((u) => !u.userUsageId);

          if (this.wordTranslations.hasPronunciation) {
            this.wordPronunciationAudio.src = this.apiService.getWordPronunciationUrl(
              this.wordTranslations.id,
            );
            this.wordPronunciationAudio.load();
          }

          this.getSuggestions();
        },
        error: (error) => {
          this.toastService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message,
            life: 3000,
          });
          this.isNewWord = false;
        },
      });
  }

  calculateAvailableWordLearningProgresses() {
    if (!this.wordTranslations) {
      return;
    }

    const currentProgress = this.wordTranslations.wordLearningProgress;

    this.availableWordLearningProgresses = [];

    if (this.initialLearningProgress >= WordLearningProgressEnum.Three) {
      for (
        let progress = WordLearningProgressEnum.Completed;
        progress > this.initialLearningProgress;
        progress--
      ) {
        if (this.wordTranslations.wordLearningProgress !== progress) {
          this.availableWordLearningProgresses.push(progress);
        }
      }
    }

    for (
      let progress = this.initialLearningProgress;
      progress >= WordLearningProgressEnum.None;
      progress--
    ) {
      if (this.wordTranslations.wordLearningProgress !== progress) {
        this.availableWordLearningProgresses.push(progress);
      }
    }
  }

  private notReturned<T extends { value: string }>(unsaved: T[], returned: T[]): T[] {
    const known = new Set(returned.map((item) => item.value.toLowerCase()));
    return unsaved.filter((item) => !known.has(item.value.toLowerCase()));
  }

  private getSuggestions() {
    this.apiService.getWordSuggestions().subscribe((suggestions: WordSuggestions) => {
      this.allSuggestions = suggestions;
    });
  }
}
