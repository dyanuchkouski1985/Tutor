import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { UserStatisticsComponent } from './components/user-statistics/user-statistics';
import { ThemeService } from './ui/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UserStatisticsComponent],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./app.scss'],
})
export class App {
  protected readonly title = signal('TutorUI');

  constructor(
    private authService: AuthService,
    themeService: ThemeService,
  ) {
    this.authService.runInitialLoginSequence();
  }
}
