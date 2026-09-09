import { Injectable, inject } from '@angular/core';
import { CanActivate } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { firstValueFrom, map, take } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);

  async canActivate(): Promise<boolean> {
    return await firstValueFrom(
      this.authService.isDoneLoading$.pipe(
        take(1),
        map(() => {
          if (this.authService.hasValidToken()) {
            return true;
          } else {
            this.authService.login();
            return false;
          }
        }),
      ),
    );
  }
}
