import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { SvgIconComponent } from 'angular-svg-icon';
import { ImageComponent } from '../../ui/image';
import { TooltipDirective } from '../../ui/tooltip';
import { StaticConfigService } from '../../services/static.config.service';
import { HighlightWordPipe } from '../../pipes/highlightWord';
import { StarComponent } from '../star/star';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';

@Component({
  selector: 'app-word-card',
  imports: [ImageComponent, TooltipDirective, HighlightWordPipe, SvgIconComponent, StarComponent],
  templateUrl: './word-card.html',
  styleUrls: ['./word-card.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordCardComponent {
  @Input() word = '';
  @Input() translations = '';
  @Input() usages: string[] = [];
  @Input() pictureIds: number[] = [];
  @Input() wordLearningProgress: WordLearningProgressEnum = WordLearningProgressEnum.None;
  @Input() isAnyNewPictureAvailable = false;
  @Input() withHelp = false;
  @Input() isWrong = false;
  @Input() isCorrect = false;

  @Output() play = new EventEmitter<void>();
  @Output() open = new EventEmitter<void>();

  constructor(public readonly staticConfigService: StaticConfigService) {}
}
