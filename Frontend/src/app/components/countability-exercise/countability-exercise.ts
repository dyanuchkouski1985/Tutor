import { Component, ChangeDetectionStrategy } from '@angular/core';
import { GapChoiceExerciseComponent } from '../gap-choice-exercise/gap-choice-exercise';
import { GapChoiceExerciseConfig } from '../../models/gap-choice-exercise';
import { ExerciseTypeEnum } from '../../enums/exercise-type.enum';

@Component({
  selector: 'app-countability-exercise',
  imports: [GapChoiceExerciseComponent],
  template: `<app-gap-choice-exercise [config]="config" />`,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class CountabilityExerciseComponent {
  readonly config: GapChoiceExerciseConfig = {
    apiName: 'Countability',
    exercise: ExerciseTypeEnum.Countability,
    unavailableMessage: 'Countable and uncountable nouns are available for English only.',
    dailyPoints: (statistics) => statistics.countabilityPercentage,
    dailyLimit: (statistics) => statistics.countabilityMaxDailyPoints,
    isAvailable: (statistics) => statistics.isAvailableCountabilityExercise,
  };
}
