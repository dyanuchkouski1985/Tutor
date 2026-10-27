import {
  afterNextRender,
  Component,
  ElementRef,
  Injector,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonComponent } from '../../ui/select-button';
import { TooltipDirective } from '../../ui/tooltip';
import { ExercisePopularityComponent } from '../exercise-popularity/exercise-popularity';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { UserStatisticsCalendar } from '../../models/user-statistics-calendar';
import {
  addDays,
  formatDate,
  getCurrentStreak,
  getLongestStreak,
  parseDate,
} from '../../core/activity-streaks';

interface CalendarCell {
  level: number;
  isToday: boolean;
  tooltip: string;
}

const monthLabelMinWeeks = 2;

type CalendarMode = 'total' | 'conversations';

interface LegendLevel {
  level: number;
  tooltip: string;
}

interface CalendarWeek {
  monthLabel: string;
  cells: (CalendarCell | null)[];
}

@Component({
  selector: 'app-activity-calendar',
  imports: [FormsModule, SelectButtonComponent, TooltipDirective, ExercisePopularityComponent],
  templateUrl: './activity-calendar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./activity-calendar.scss'],
})
export class ActivityCalendarComponent {
  @ViewChild('grid') grid: ElementRef<HTMLElement>;

  view: 'calendar' | 'exercises' = 'calendar';
  viewOptions = [
    { label: 'Calendar', value: 'calendar' },
    { label: 'Exercises', value: 'exercises' },
  ];
  months = 6;
  periodOptions = [
    { label: '6 months', value: 6 },
    { label: '1 year', value: 12 },
    { label: '2 years', value: 24 },
    { label: 'All time', value: 0 },
  ];
  mode: CalendarMode = 'total';
  modeOptions = [
    { label: 'All', value: 'total' },
    { label: 'Conversations', value: 'conversations' },
  ];
  weekDayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];
  weeks: CalendarWeek[] = [];
  goal = 100;
  legendLevels: LegendLevel[] = this.buildLegendLevels();
  currentStreak = 0;
  longestStreak = 0;
  goalDaysCount = 0;
  activeDaysCount = 0;
  daysCount = 0;
  private calendar: UserStatisticsCalendar | null = null;
  private loadSubscription: Subscription | null = null;

  constructor(
    private readonly apiService: ApiService,
    private readonly injector: Injector,
  ) {
    this.load();
  }

  load() {
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = this.apiService
      .getUserStatisticsCalendar(this.months)
      .pipe(take(1))
      .subscribe({
        next: (calendar) => {
          this.calendar = calendar;
          this.build();
          this.scrollToToday();
        },
        error: (error) => {
          console.error(error.message);
        },
      });
  }

  onViewChange() {
    if (this.view === 'calendar') {
      this.scrollToToday();
    }
  }

  build() {
    const calendar = this.calendar;
    if (!calendar) {
      return;
    }

    const isTotal = this.mode === 'total';
    this.goal = isTotal ? calendar.dailyGoalPoints : calendar.conversationMaxDailyPoints;
    this.legendLevels = this.buildLegendLevels();
    const days = new Map(calendar.days.map((d) => [d.date, d]));
    const from = parseDate(calendar.from);
    const to = parseDate(calendar.to);
    const weeks: CalendarWeek[] = [];
    const goalFlags: boolean[] = [];
    let previousMonth = -1;
    let activeDaysCount = 0;

    for (
      let weekStart = addDays(from, -((from.getDay() + 6) % 7));
      weekStart <= to;
      weekStart = addDays(weekStart, 7)
    ) {
      const week: CalendarWeek = { monthLabel: '', cells: [] };

      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        if (date < from || date > to) {
          week.cells.push(null);
          continue;
        }

        if (date.getMonth() !== previousMonth) {
          previousMonth = date.getMonth();
          week.monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
        }

        const day = days.get(formatDate(date));
        const conversationPoints = day?.conversationPercentage ?? 0;
        const points = isTotal ? (day?.percentage ?? 0) : conversationPoints;
        goalFlags.push(points >= this.goal);
        if (points > 0) {
          activeDaysCount++;
        }

        week.cells.push({
          level: this.getLevel(points),
          isToday: date.getTime() === to.getTime(),
          tooltip:
            date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }) +
            ': ' +
            (isTotal
              ? points +
                (conversationPoints > 0 ? ` (${conversationPoints} from conversations)` : '')
              : `${points}/${this.goal} from conversations`),
        });
      }

      weeks.push(week);
    }

    let previousLabelIndex = -monthLabelMinWeeks;
    weeks.forEach((week, index) => {
      if (!week.monthLabel) {
        return;
      }
      if (index > weeks.length - monthLabelMinWeeks) {
        week.monthLabel = '';
        return;
      }
      if (index - previousLabelIndex < monthLabelMinWeeks) {
        weeks[previousLabelIndex].monthLabel = '';
      }
      previousLabelIndex = index;
    });

    this.weeks = weeks;
    this.daysCount = goalFlags.length;
    this.goalDaysCount = goalFlags.filter((g) => g).length;
    this.activeDaysCount = activeDaysCount;
    this.longestStreak = getLongestStreak(goalFlags);
    this.currentStreak = getCurrentStreak(goalFlags);
  }

  private buildLegendLevels(): LegendLevel[] {
    const goal = this.goal;
    return [
      { level: 0, tooltip: 'No points' },
      { level: 1, tooltip: `1–${goal - 1} points` },
      {
        level: 2,
        tooltip: `${goal}+ points (${this.mode === 'total' ? 'goal' : 'daily cap'} reached)`,
      },
    ];
  }

  private getLevel(points: number): number {
    if (points <= 0) {
      return 0;
    }
    return points >= this.goal ? 2 : 1;
  }

  private scrollToToday() {
    afterNextRender(
      {
        write: () => {
          const element = this.grid?.nativeElement;
          if (element) {
            element.scrollLeft = element.scrollWidth;
          }
        },
      },
      { injector: this.injector },
    );
  }
}
