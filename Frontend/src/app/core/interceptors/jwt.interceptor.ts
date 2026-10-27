import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, catchError, throwError, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  private handleAuthError(err: HttpErrorResponse): Observable<never> {
    if (err.status === 401) {
      this.authService.login();
    }
    return throwError(() => err);
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'X-Timezone-Offset': String(new Date().getTimezoneOffset()),
        },
      });
    }

    return next.handle(request).pipe(catchError((err) => this.handleAuthError(err)));
  }
}
