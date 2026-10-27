import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-exercise-unavailable',
  imports: [],
  templateUrl: './exercise-unavailable.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./exercise-unavailable.scss'],
})
export class ExerciseUnavailableComponent {
  @Input() message = '';

  constructor(private readonly router: Router) {}

  onHome() {
    this.router.navigate(['/']);
  }
}
