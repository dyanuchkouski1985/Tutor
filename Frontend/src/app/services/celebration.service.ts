import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CelebrationService {
  private nudge$ = new Subject<void>();
  public nudgeObservable = this.nudge$.asObservable();

  nudge() {
    this.nudge$.next();
  }
}
