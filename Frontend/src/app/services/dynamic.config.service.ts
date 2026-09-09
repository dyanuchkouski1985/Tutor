import { Injectable } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { LanguageEnum } from '../enums/language.enum';
import { AuthService } from './auth.service';
import { ThemeState } from '../components/theme-switcher/theme-switcher';

export class Settings {
  language = LanguageEnum.Polish;
  muteSound = false;
  themeState: ThemeState = {
    preset: 'Aura',
  };
}

@Injectable({
  providedIn: 'root',
})
export class DynamicConfigService {
  private settings = new Settings();
  private settingsKey: string = '';

  constructor(
    private readonly authService: AuthService,
    oauthService: OAuthService,
  ) {
    authService.isAuthenticated$.subscribe((hasValidAccessToken: boolean) => {
      if (hasValidAccessToken) {
        this.settingsKey = oauthService.getIdentityClaims()['sub'] + '-settings';
        const settingsJson = localStorage.getItem(this.settingsKey);
        this.settings = JSON.parse(settingsJson || '{}');

        if (this.settings) {
          this.settings.language = this.settings.language || LanguageEnum.English;
          this.settings.muteSound = this.settings.muteSound === true;
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

  get themeState() {
    return this.settings.themeState;
  }

  set themeState(themeState: ThemeState) {
    this.settings.themeState = themeState;
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
