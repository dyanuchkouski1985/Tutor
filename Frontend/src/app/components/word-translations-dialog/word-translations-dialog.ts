import { Component, ViewChild, OnInit } from '@angular/core';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { ApiService } from '../../services/api.service';
import { Suggestion, WordSuggestions } from '../../models/word-suggestions';
import { finalize, take } from 'rxjs/operators';
import { WordTranslations } from '../../models/word-translations';
import { Translation } from '../../models/translation';
import { MessageService } from 'primeng/api';
import { PickList, PickListModule } from 'primeng/picklist';
import { Usage } from '../../models/usage';
import { Picture } from '../../models/picture';
import { StaticConfigService } from '../../services/static.config.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { SoundService } from '../../services/sound.service';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { CommonModule } from '@angular/common';
import { StarComponent } from '../star/star';
import { InputGroupModule } from 'primeng/inputgroup';
import { FloatLabelModule } from 'primeng/floatlabel';
import { FormsModule } from '@angular/forms';
import { SvgIconComponent } from 'angular-svg-icon';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AutoFocusModule } from 'primeng/autofocus';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-word-translations-dialog',
  imports: [
    AutoFocusModule,
    CommonModule,
    InputTextModule,
    InputGroupModule,
    FloatLabelModule,
    AutoCompleteModule,
    FormsModule,
    DialogModule,
    PickListModule,
    FileUploadModule,
    ImageModule,
    ToastModule,
    CheckboxModule,
    PopoverModule,
    ButtonModule,
    RippleModule,
    SvgIconComponent,
    StarComponent,
  ],
  templateUrl: './word-translations-dialog.html',
  styleUrls: ['./word-translations-dialog.scss'],
})
export class WordTranslationsDialogComponent implements OnInit {
  @ViewChild('panelEditLearningProgress') panelEditLearningProgress: any;
  @ViewChild('panelUploadWordPronunciation') panelUploadWordPronunciation: any;
  @ViewChild('panelNewTranslation') panelNewTranslation: any;
  @ViewChild('panelNewUsage') panelNewUsage: any;
  @ViewChild('translationsPickList') translationsPickList: PickList;
  @ViewChild('usagesPickList') usagesPickList: PickList;

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
  wordLearningProgressEnum = WordLearningProgressEnum;
  initialLearningProgress: WordLearningProgressEnum;
  availableWordLearningProgresses: WordLearningProgressEnum[] = [];
  flipLearningProgressIcon = false;
  flipPronunciationIcon = false;

  private allSuggestions: WordSuggestions;
  private wordPronunciationAudio = new Audio();
  private onWordSaved: any;

  constructor(
    public readonly staticConfigService: StaticConfigService,
    private config: DynamicDialogConfig,
    private readonly apiService: ApiService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly soundService: SoundService,
    private readonly messageService: MessageService,
  ) {}

  ngOnInit() {
    if (this.config?.data) {
      this.word = this.config.data.word;
      this.onWordSaved = this.config.data.onWordSaved;
      if (this.word) {
        this.onCheckNewWord();
      }
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

  onComplete(event: AutoCompleteCompleteEvent) {
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
      this.messageService.add({
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

  onCheckNewWord() {
    setTimeout(() => {
      this.isBusy = true;
    });

    this.apiService
      .getWordTranslations(this.word)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
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
      this.messageService.add({
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
      this.messageService.add({
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

  onAddNewTranslation() {
    this.newTranslation = this.newTranslation.trim();
    if (!this.newTranslation.length) {
      this.messageService.add({
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
      this.messageService.add({
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
      this.messageService.add({
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
      this.messageService.add({
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

  onMoveToTarget(event: { items: any[] }) {
    if (!this.myTranslations.some((t) => t.id === event.items[0].id)) {
      this.myTranslations = [...this.myTranslations, ...event.items];
    }

    this.othersTranslations = this.othersTranslations.filter((i) => !event.items.includes(i));
  }

  onMoveToSource(event: { items: any[] }) {
    if (!this.othersTranslations.some((t) => t.id === event.items[0].id)) {
      this.othersTranslations = [...this.othersTranslations, ...event.items];
    }

    this.myTranslations = this.myTranslations.filter((i) => !event.items.includes(i));
  }

  clearTranslationsSelection() {
    this.translationsPickList.selectedItemsTarget = [];
    this.translationsPickList.selectedItemsSource = [];
  }

  clearUsagesSelection() {
    this.usagesPickList.selectedItemsTarget = [];
    this.usagesPickList.selectedItemsSource = [];
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
      this.messageService.add({
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
      this.messageService.add({
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
          this.onWordSaved(this.wordTranslations);

          this.flipLearningProgressIcon = this.isNewWord;
          this.flipPronunciationIcon = this.isNewWord;

          this.isNewWord =
            this.wordTranslations.translations.every((t) => !t.userTranslationId) === true;
          this.wordTranslations.userUpload = !this.isNewWord;
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
          this.messageService.add({
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

  private getSuggestions() {
    this.apiService.getWordSuggestions().subscribe((suggestions: WordSuggestions) => {
      this.allSuggestions = suggestions;
    });
  }
}
