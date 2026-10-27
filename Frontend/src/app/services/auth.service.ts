import { Injectable } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { StaticConfigService } from './static.config.service';

const lastLoginRedirectKey = 'last-login-redirect';
const loginRedirectCooldownMs = 15000;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authConfig!: any;
  private isLoginPending = false;

  private isAuthenticatedSubject$ = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticatedSubject$.asObservable();

  private isDoneLoadingSubject$ = new ReplaySubject<boolean>(1);
  isDoneLoading$ = this.isDoneLoadingSubject$.asObservable();

  constructor(
    private readonly oauthService: OAuthService,
    private readonly router: Router,
    staticConfigService: StaticConfigService,
  ) {
    this.authConfig = {
      issuer: staticConfigService.identityUrl,
      redirectUri: window.location.origin,
      tokenEndpoint: staticConfigService.identityUrl + 'connect/token',
      postLogoutRedirectUri: window.location.origin,
      clientId: 'tutor-client',
      responseType: 'code',
      scope: 'openid profile email api offline_access',
      showDebugInformation: true,
      clearHashAfterLogin: true,
      timeoutFactor: 0.95,
    };

    this.oauthService.configure(this.authConfig);
    this.oauthService.events.subscribe((_) =>
      this.isAuthenticatedSubject$.next(this.oauthService.hasValidAccessToken()),
    );
    this.oauthService.setStorage(localStorage);
    this.oauthService.setupAutomaticSilentRefresh();
  }

  runInitialLoginSequence(): Promise<void> {
    return this.oauthService
      .loadDiscoveryDocument()
      .then(() => this.oauthService.tryLoginCodeFlow())
      .then(() => {
        this.isDoneLoadingSubject$.next(true);

        this.router.navigate([], {
          queryParams: {},
          replaceUrl: true,
        });
      })
      .catch((err) => console.error(err));
  }

  login() {
    if (this.isLoginPending) {
      return;
    }
    this.isLoginPending = true;

    const lastLoginAt = Number(sessionStorage.getItem(lastLoginRedirectKey) ?? 0);
    const delay = Math.max(0, lastLoginAt + loginRedirectCooldownMs - Date.now());
    setTimeout(() => {
      sessionStorage.setItem(lastLoginRedirectKey, String(Date.now()));
      this.oauthService.initCodeFlow();
    }, delay);
  }

  logout() {
    sessionStorage.removeItem(lastLoginRedirectKey);
    this.oauthService.logOut();
  }

  hasValidToken() {
    return this.oauthService.hasValidAccessToken();
  }

  getToken() {
    return this.oauthService.getAccessToken();
  }
}
