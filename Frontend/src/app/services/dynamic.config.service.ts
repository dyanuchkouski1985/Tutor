import { Injectable } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { LanguageEnum } from '../enums/language.enum';
import { TranslationLanguageEnum } from '../enums/translation-language.enum';
import { ParticipantGenderEnum } from '../enums/participant-gender.enum';
import { AuthService } from './auth.service';
import type { ThemeState } from '../ui/theme/theme.service';
import { formatDate } from '../core/activity-streaks';

export interface PendingCelebration {
  goal: boolean;
  conversations: boolean;
  date: string;
}

export interface StartedExercises {
  date: string;
  exercises: string[];
}

export type MistakesView = 'status' | 'recent';

export class Settings {
  language = LanguageEnum.Polish;
  translationLanguage = TranslationLanguageEnum.Russian;
  sentenceLanguages: Partial<Record<LanguageEnum, TranslationLanguageEnum>> = {};
  pendingCelebrations: Partial<Record<LanguageEnum, PendingCelebration>> = {};
  startedExercises: Partial<Record<LanguageEnum, StartedExercises>> = {};
  muteSound = false;
  themeState: ThemeState = {};
  mistakesView: MistakesView = 'status';
}

@Injectable({
  providedIn: 'root',
})
export class DynamicConfigService {
  private settings = new Settings();
  private settingsKey: string = '';

  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {
    authService.isAuthenticated$.subscribe((hasValidAccessToken: boolean) => {
      if (hasValidAccessToken) {
        this.settingsKey = oauthService.getIdentityClaims()['sub'] + '-settings';
        const settingsJson = localStorage.getItem(this.settingsKey);
        this.settings = JSON.parse(settingsJson || '{}');

        if (this.settings) {
          this.settings.language = this.settings.language || LanguageEnum.English;
          this.settings.translationLanguage =
            this.settings.translationLanguage || TranslationLanguageEnum.Russian;
          this.settings.sentenceLanguages = this.settings.sentenceLanguages || {};
          this.settings.pendingCelebrations = this.settings.pendingCelebrations || {};
          this.settings.startedExercises =
            this.settings.startedExercises && !('date' in this.settings.startedExercises)
              ? this.settings.startedExercises
              : {};
          this.settings.muteSound = this.settings.muteSound === true;
          this.settings.mistakesView =
            this.settings.mistakesView === 'recent' ? 'recent' : 'status';
        }
      }
    });
  }

  get language() {
    return this.settings.language;
  }

  set language(language: LanguageEnum) {
    this.settings.language = language;
    this.saveSettings();
  }

  get translationLanguage() {
    return this.settings.translationLanguage;
  }

  set translationLanguage(translationLanguage: TranslationLanguageEnum) {
    this.settings.translationLanguage = translationLanguage;
    this.saveSettings();
  }

  get sentenceLanguage() {
    return this.settings.sentenceLanguages?.[this.settings.language];
  }

  set sentenceLanguage(sentenceLanguage: TranslationLanguageEnum | undefined) {
    this.settings.sentenceLanguages = {
      ...this.settings.sentenceLanguages,
      [this.settings.language]: sentenceLanguage,
    };
    this.saveSettings();
  }

  get pendingCelebration() {
    return this.settings.pendingCelebrations?.[this.settings.language];
  }

  set pendingCelebration(pendingCelebration: PendingCelebration | undefined) {
    this.settings.pendingCelebrations = {
      ...this.settings.pendingCelebrations,
      [this.settings.language]: pendingCelebration,
    };
    this.saveSettings();
  }

  isExerciseStarted(exercise: string) {
    return this.todayStartedExercises.includes(exercise);
  }

  markExerciseStarted(exercise: string) {
    const exercises = this.todayStartedExercises;

    if (exercises.includes(exercise)) {
      return;
    }

    this.settings.startedExercises = {
      ...this.settings.startedExercises,
      [this.settings.language]: {
        date: formatDate(new Date()),
        exercises: [...exercises, exercise],
      },
    };
    this.saveSettings();
  }

  private get todayStartedExercises() {
    const startedExercises = this.settings.startedExercises?.[this.settings.language];

    return startedExercises?.date === formatDate(new Date()) ? startedExercises.exercises : [];
  }

  get gender() {
    switch (this.oauthService.getIdentityClaims()?.['gender']) {
      case 'Male':
        return ParticipantGenderEnum.Male;
      case 'Female':
        return ParticipantGenderEnum.Female;
      default:
        return ParticipantGenderEnum.Unspecified;
    }
  }

  get themeState() {
    return this.settings.themeState;
  }

  set themeState(themeState: ThemeState) {
    this.settings.themeState = themeState;
    this.saveSettings();
  }

  get mistakesView() {
    return this.settings.mistakesView;
  }

  set mistakesView(mistakesView: MistakesView) {
    this.settings.mistakesView = mistakesView;
    this.saveSettings();
  }

  get muteSound() {
    return this.settings.muteSound;
  }

  toggleSound() {
    this.settings.muteSound = !this.settings.muteSound;
    this.saveSettings();
  }

  private saveSettings() {
    localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
  }
}
