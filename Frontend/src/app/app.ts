import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from './services/auth.service';
import { UserStatisticsComponent } from './components/user-statistics/user-statistics';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, UserStatisticsComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  protected readonly title = signal('TutorUI');

  constructor(private authService: AuthService) {
    this.authService.runInitialLoginSequence();
  }
}
