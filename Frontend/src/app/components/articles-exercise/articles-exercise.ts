import { Component, ChangeDetectionStrategy } from '@angular/core';
import { GapChoiceExerciseComponent } from '../gap-choice-exercise/gap-choice-exercise';
import { GapChoiceExerciseConfig } from '../../models/gap-choice-exercise';
import { ExerciseTypeEnum } from '../../enums/exercise-type.enum';

@Component({
  selector: 'app-articles-exercise',
  imports: [GapChoiceExerciseComponent],
  template: `<app-gap-choice-exercise [config]="config" />`,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ArticlesExerciseComponent {
  readonly config: GapChoiceExerciseConfig = {
    apiName: 'Articles',
    exercise: ExerciseTypeEnum.Articles,
    unavailableMessage: 'Articles are available for English only.',
    noWordLabel: 'no article',
    dailyPoints: (statistics) => statistics.articlesPercentage,
    dailyLimit: (statistics) => statistics.articlesMaxDailyPoints,
    isAvailable: (statistics) => statistics.isAvailableArticlesExercise,
  };
}
