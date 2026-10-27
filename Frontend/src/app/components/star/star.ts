import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';
import { SvgIconComponent } from 'angular-svg-icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star',
  imports: [CommonModule, SvgIconComponent],
  templateUrl: './star.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./star.scss'],
})
export class StarComponent {
  wordLearningProgressEnum = WordLearningProgressEnum;
  @Input() highlighted = false;
  @Input() filterable = false;
  @Input() filtered = false;
  @Input() wordLearningProgress = WordLearningProgressEnum.None;
}
