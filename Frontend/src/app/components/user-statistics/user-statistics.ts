import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { launchFireworks, launchSuccessFireworks } from '../../core/fireworks';
import { AuthService } from '../../services/auth.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';
import { Subscription } from 'rxjs';
import { UserStatistics } from '../../models/user-statistics';
import { SvgIconComponent } from 'angular-svg-icon';
import { TooltipDirective } from '../../ui/tooltip';
import { StarComponent } from '../star/star';
import { DialogService } from '../../ui/dialog';
import { ActivityCalendarComponent } from '../activity-calendar/activity-calendar';

import { ToastComponent, ToastService } from '../../ui/toast';
import { take } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { DynamicConfigService } from '../../services/dynamic.config.service';
import { CelebrationService } from '../../services/celebration.service';
import { LanguageEnum } from '../../enums/language.enum';
import { UserStatisticsCalendarDay } from '../../models/user-statistics-calendar';
import {
  getCurrentStreak,
  getGoalFlags,
  getLongestStreak,
  formatDate,
  getPeriodStart,
  parseDate,
} from '../../core/activity-streaks';

import { RoundProgressModule } from 'angular-svg-round-progressbar';

const dailyGoalPoints = 100;
const fireworksDurationMs = 10000;

const allTimeLabel = 'All time';

const bestStreakPeriods = [
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
  { label: '2 years', months: 24 },
  { label: allTimeLabel, months: 0 },
];

interface BestStreak {
  value: number;
  isRecord: boolean;
}

interface CelebrationTrigger {
  goal: boolean;
  conversations: boolean;
}

interface GoalReachedToastData {
  achievements: string[];
  currentStreak: number;
  conversationStreak: number;
  bestStreaks: { label: string; total: BestStreak; conversations: BestStreak }[];
  records: string[];
}

@Component({
  selector: 'app-user-statistics',
  imports: [RoundProgressModule, TooltipDirective, ToastComponent, SvgIconComponent, StarComponent],
  templateUrl: './user-statistics.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./user-statistics.scss'],
})
export class UserStatisticsComponent implements OnDestroy {
  wordLearningProgressEnum = WordLearningProgressEnum;
  userStatistics: UserStatistics | null = null;
  @ViewChild('celebrationButton') celebrationButton?: ElementRef<HTMLButtonElement>;

  plasmaBolts = [
    { angle: 0, delay: 0, duration: 1.3, path: 'M24 24 L27 19 L25 15 L28 10 L26 4' },
    { angle: 70, delay: 0.4, duration: 1.7, path: 'M24 24 L21 19 L24 14 L22 9 L25 4' },
    { angle: 140, delay: 0.9, duration: 1.1, path: 'M24 24 L26 18 L23 13 L26 8 L24 4' },
    { angle: 205, delay: 0.2, duration: 1.5, path: 'M24 24 L22 18 L25 14 L23 9 L26 4' },
    { angle: 280, delay: 0.7, duration: 1.9, path: 'M24 24 L27 20 L24 15 L27 11 L25 4' },
  ];
  plasmaBurstAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  onPlasmaBoltFired(bolt: { angle: number }) {
    bolt.angle = Math.floor(Math.random() * 360);
  }

  private subscriptions = new Subscription();

  get isConversation() {
    return this.router.url.startsWith('/speech-exercise');
  }

  private userStatisticsLanguage: LanguageEnum | null = null;

  constructor(
    authService: AuthService,
    userStatisticsService: UserStatisticsService,
    private readonly dialogService: DialogService,
    private readonly apiService: ApiService,
    private readonly toastService: ToastService,
    private readonly dynamicConfigService: DynamicConfigService,
    private readonly ngZone: NgZone,
    private readonly router: Router,
    celebrationService: CelebrationService,
  ) {
    this.subscriptions.add(
      celebrationService.nudgeObservable.subscribe(() =>
        this.celebrationButton?.nativeElement.animate(
          [
            { transform: 'translateY(0)', offset: 0 },
            { transform: 'translateY(0)', offset: 0.2 },
            { transform: 'translateY(-30px)', offset: 0.4 },
            { transform: 'translateY(0)', offset: 0.5 },
            { transform: 'translateY(-15px)', offset: 0.6 },
            { transform: 'translateY(0)', offset: 0.8 },
            { transform: 'translateY(0)', offset: 1 },
          ],
          { duration: 1000, iterations: 2 },
        ),
      ),
    );

    this.subscriptions.add(
      userStatisticsService.userStatisticsObservable.subscribe((data) => {
        const language = this.dynamicConfigService.language;
        const previous = this.userStatistics;
        if (previous && this.userStatisticsLanguage === language) {
          const trigger: CelebrationTrigger = {
            goal:
              previous.dailyPercentage < dailyGoalPoints && data.dailyPercentage >= dailyGoalPoints,
            conversations:
              previous.conversationPercentage < data.conversationMaxDailyPoints &&
              data.conversationPercentage >= data.conversationMaxDailyPoints,
          };
          if (trigger.goal || trigger.conversations) {
            const pending = this.pendingCelebration;
            this.dynamicConfigService.pendingCelebration = {
              goal: trigger.goal || !!pending?.goal,
              conversations: trigger.conversations || !!pending?.conversations,
              date: formatDate(new Date()),
            };
          }
        }
        this.userStatistics = data;
        this.userStatisticsLanguage = language;
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

  get pendingCelebration() {
    const pending = this.dynamicConfigService.pendingCelebration;
    return pending?.date === formatDate(new Date()) ? pending : undefined;
  }

  get pendingCelebrationTitle() {
    const trigger = this.pendingCelebration;
    return trigger?.goal && trigger.conversations
      ? 'Goals reached!'
      : trigger?.goal
        ? 'Daily goal reached!'
        : 'Conversation goal reached!';
  }

  onOpenCelebration() {
    const trigger = this.pendingCelebration;
    if (!trigger) {
      return;
    }
    this.dynamicConfigService.pendingCelebration = undefined;
    this.showGoalReachedToast(trigger);
  }

  openActivityCalendar() {
    this.dialogService.open(ActivityCalendarComponent, {
      header: 'Activity',
      focusOnShow: false,
      styleClass: 'activity-calendar-dialog',
    });
  }

  onToastPointerDown(event: PointerEvent) {
    const toast = (event.currentTarget as HTMLElement).closest<HTMLElement>('.ui-toast-message');
    if (!toast || event.button !== 0) {
      return;
    }
    event.preventDefault();

    const originX = event.clientX - Number(toast.dataset['dragX'] ?? 0);
    const originY = event.clientY - Number(toast.dataset['dragY'] ?? 0);

    this.ngZone.runOutsideAngular(() => {
      const move = (moveEvent: PointerEvent) => {
        const x = moveEvent.clientX - originX;
        const y = moveEvent.clientY - originY;
        toast.dataset['dragX'] = String(x);
        toast.dataset['dragY'] = String(y);
        toast.style.translate = `${x}px ${y}px`;
      };
      const stop = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', stop);
        document.removeEventListener('pointercancel', stop);
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', stop);
      document.addEventListener('pointercancel', stop);
    });
  }

  private showGoalReachedToast(trigger: CelebrationTrigger) {
    this.apiService
      .getUserStatisticsCalendar(0)
      .pipe(take(1))
      .subscribe({
        next: (calendar) => {
          const to = parseDate(calendar.to);
          const from = parseDate(calendar.from);
          const isGoal = (day: UserStatisticsCalendarDay | undefined) =>
            (day?.percentage ?? 0) >= calendar.dailyGoalPoints;
          const isConversationCap = (day: UserStatisticsCalendarDay | undefined) =>
            (day?.conversationPercentage ?? 0) >= calendar.conversationMaxDailyPoints;

          const bestStreaks = bestStreakPeriods.map((period) => {
            const periodStart = period.months ? getPeriodStart(to, period.months) : from;
            return {
              label: period.label,
              total: this.getBestStreak(getGoalFlags(calendar, periodStart, isGoal), trigger.goal),
              conversations: this.getBestStreak(
                getGoalFlags(calendar, periodStart, isConversationCap),
                trigger.conversations,
              ),
            };
          });

          const today = calendar.days.find((d) => d.date === calendar.to);
          const todayPoints = today?.percentage ?? 0;
          const todayConversationPoints = today?.conversationPercentage ?? 0;

          const data: GoalReachedToastData = {
            achievements: [
              trigger.goal ? `Daily goal reached · ${todayPoints} points` : null,
              trigger.conversations
                ? `Conversation goal reached · ${todayConversationPoints}/${calendar.conversationMaxDailyPoints} points`
                : null,
            ].filter((line): line is string => line !== null),
            currentStreak: getCurrentStreak(getGoalFlags(calendar, from, isGoal)),
            conversationStreak: getCurrentStreak(getGoalFlags(calendar, from, isConversationCap)),
            bestStreaks: bestStreaks,
            records: [
              this.getRecordLine(
                'All',
                bestStreaks.filter((b) => b.total.isRecord),
              ),
              this.getRecordLine(
                'Conversations',
                bestStreaks.filter((b) => b.conversations.isRecord),
              ),
            ].filter((line): line is string => line !== null),
          };

          const withSound = !this.dynamicConfigService.muteSound;
          if (data.records.length) {
            this.ngZone.runOutsideAngular(() =>
              launchFireworks(fireworksDurationMs, withSound, Infinity, ['peony', 'crossette']),
            );
          } else {
            this.ngZone.runOutsideAngular(() => launchSuccessFireworks(withSound));
          }

          this.toastService.add({
            key: 'goal-reached',
            severity: 'success',
            summary: data.records.length
              ? 'New record!'
              : trigger.goal && trigger.conversations
                ? 'Goals reached!'
                : trigger.goal
                  ? 'Daily goal reached!'
                  : 'Conversation goal reached!',
            life: 60000,
            closable: true,
            data: data,
          });
        },
        error: (error) => {
          console.error(error.message);
        },
      });
  }

  private getBestStreak(flags: boolean[], isCelebrated: boolean): BestStreak {
    return {
      value: getLongestStreak(flags),
      isRecord:
        isCelebrated &&
        flags[flags.length - 1] &&
        getCurrentStreak(flags) > getLongestStreak(flags.slice(0, -1)),
    };
  }

  private getRecordLine(title: string, records: { label: string }[]): string | null {
    if (!records.length) {
      return null;
    }
    const allTime = records.find((r) => r.label === allTimeLabel);
    if (allTime) {
      return `${title}: ${allTime.label}`;
    }
    return `${title}: ${records
      .map((r) => r.label)
      .reverse()
      .join(', ')}`;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
