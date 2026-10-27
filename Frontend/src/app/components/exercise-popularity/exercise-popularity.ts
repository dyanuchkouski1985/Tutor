import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { SvgIconComponent } from 'angular-svg-icon';
import { SelectButtonComponent } from '../../ui/select-button';
import { ApiService } from '../../services/api.service';
import { ExerciseTypeEnum } from '../../enums/exercise-type.enum';

interface ExerciseInfo {
  label: string;
  icon: string;
}

interface PopularityRow extends ExerciseInfo {
  days: number;
  percentage: number;
  barPercent: number;
}

const exercises: Record<ExerciseTypeEnum, ExerciseInfo> = {
  [ExerciseTypeEnum.TranslationsWord]: { label: 'Translations', icon: 'translations-word' },
  [ExerciseTypeEnum.RepeatPausedWords]: { label: 'Repeat', icon: 'repeat' },
  [ExerciseTypeEnum.Crossword]: { label: 'Crossword', icon: 'crossword' },
  [ExerciseTypeEnum.Conversation]: { label: 'Conversations', icon: 'speech' },
  [ExerciseTypeEnum.SentenceTranslation]: { label: 'Sentences', icon: 'sentence-translation' },
  [ExerciseTypeEnum.Guess]: { label: 'Guess', icon: 'guess' },
  [ExerciseTypeEnum.Explain]: { label: 'Explain', icon: 'explain' },
  [ExerciseTypeEnum.Listening]: { label: 'Listening', icon: 'listening' },
  [ExerciseTypeEnum.Countability]: { label: 'Much or many', icon: 'countability' },
  [ExerciseTypeEnum.VerbForms]: { label: 'Verb forms', icon: 'verb-forms' },
  [ExerciseTypeEnum.Articles]: { label: 'Articles', icon: 'articles' },
  [ExerciseTypeEnum.Mistakes]: { label: 'Mistakes', icon: 'mistakes' },
};

@Component({
  selector: 'app-exercise-popularity',
  imports: [FormsModule, SelectButtonComponent, SvgIconComponent],
  templateUrl: './exercise-popularity.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./exercise-popularity.scss'],
})
export class ExercisePopularityComponent {
  months = 6;
  periodOptions = [
    { label: '6 months', value: 6 },
    { label: '1 year', value: 12 },
    { label: '2 years', value: 24 },
    { label: 'All time', value: 0 },
  ];
  isAllUsers = false;
  scopeOptions = [
    { label: 'Mine', value: false },
    { label: 'Everyone', value: true },
  ];
  rows: PopularityRow[] = [];
  isAllUsersShown = false;
  isLoaded = false;
  private loadSubscription: Subscription | null = null;

  constructor(private readonly apiService: ApiService) {
    this.load();
  }

  get hasData() {
    return this.rows.some((row) => row.days > 0);
  }

  load() {
    const isAllUsers = this.isAllUsers;

    this.loadSubscription?.unsubscribe();
    this.loadSubscription = this.apiService
      .getExerciseCompletionSummary(this.months, isAllUsers)
      .pipe(take(1))
      .subscribe({
        next: (summary) => {
          const maxDays = Math.max(0, ...summary.map((item) => item.days));

          this.rows = summary.map((item) => ({
            ...exercises[item.exercise],
            days: item.days,
            percentage: item.percentage,
            barPercent: maxDays ? (100 * item.days) / maxDays : 0,
          }));
          this.isAllUsersShown = isAllUsers;
          this.isLoaded = true;
        },
        error: (error) => {
          console.error(error.message);
        },
      });
  }
}
