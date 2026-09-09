import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { UserStatistics } from '../models/user-statistics';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class UserStatisticsService implements OnDestroy {
  private userStatistics = new UserStatistics();
  private userStatistics$ = new Subject<UserStatistics>();
  private subscriptions = new Subscription();
  public userStatisticsObservable = this.userStatistics$.asObservable();

  constructor(private readonly apiService: ApiService) {}

  refresh() {
    this.subscriptions.add(
      this.apiService.getUserStatistics().subscribe((data) => {
        this.userStatistics = data;
        this.userStatistics$.next(data);
      }),
    );
  }

  get() {
    return this.userStatistics;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
