import { Component, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';
import { Subscription } from 'rxjs';
import { UserStatistics } from '../../models/user-statistics';
import { SvgIconComponent } from 'angular-svg-icon';
import { TooltipModule } from 'primeng/tooltip';
import { StarComponent } from '../star/star';

import { RoundProgressModule } from 'angular-svg-round-progressbar';

@Component({
  selector: 'app-user-statistics',
  imports: [RoundProgressModule, TooltipModule, SvgIconComponent, StarComponent],
  templateUrl: './user-statistics.html',
  styleUrls: ['./user-statistics.scss'],
})
export class UserStatisticsComponent implements OnDestroy {
  wordLearningProgressEnum = WordLearningProgressEnum;
  userStatistics: UserStatistics | null = null;
  private subscriptions = new Subscription();

  constructor(authService: AuthService, userStatisticsService: UserStatisticsService) {
    this.subscriptions.add(
      userStatisticsService.userStatisticsObservable.subscribe((data) => {
        this.userStatistics = data;
      }),
    );

    this.subscriptions.add(
      authService.isAuthenticated$.subscribe((hasValidAccessToken: boolean) => {
        if (hasValidAccessToken) {
          userStatisticsService.refresh();
        }
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
