import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, formatDate } from '@angular/common';
import { SvgIconComponent } from 'angular-svg-icon';
import { TooltipDirective } from '../../ui/tooltip';
import { PopoverComponent } from '../../ui/popover';
import { SoundService } from '../../services/sound.service';
import { finalize, take } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { StaticConfigService } from '../../services/static.config.service';
import { DynamicConfigService, MistakesView } from '../../services/dynamic.config.service';
import { FormsModule } from '@angular/forms';
import { SelectButtonComponent } from '../../ui/select-button';
import { MistakePattern, MistakeStatusGroup } from '../../models/mistake-pattern';
import { MistakeProgressEnum } from '../../enums/mistake-progress.enum';
import {
  mistakeMasteredReviewDays,
  mistakeProgressClass,
  mistakeProgressLabel,
} from '../../core/mistake-progress';

@Component({
  selector: 'app-mistakes',
  imports: [
    CommonModule,
    FormsModule,
    SvgIconComponent,
    TooltipDirective,
    PopoverComponent,
    SelectButtonComponent,
  ],
  templateUrl: './mistakes.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./mistakes.scss'],
})
export class MistakesComponent implements OnInit {
  mistakeProgressEnum = MistakeProgressEnum;
  progressLabel = mistakeProgressLabel;
  progressClass = mistakeProgressClass;
  viewOptions = [
    { label: 'By status', value: 'status' },
    { label: 'Recent', value: 'recent' },
  ];
  groups: MistakeStatusGroup[] = [];
  ignored: MistakePattern[] = [];
  isIgnoredExpanded = false;
  availableCount = 0;
  revealedIds = new Set<number>();
  isBusy = false;
  isLoaded = false;
  loadError = '';

  private patterns: MistakePattern[] = [];

  constructor(
    private readonly staticConfigService: StaticConfigService,
    private readonly apiService: ApiService,
    private readonly soundService: SoundService,
    private readonly router: Router,
    private readonly dynamicConfigService: DynamicConfigService,
  ) {}

  get view() {
    return this.dynamicConfigService.mistakesView;
  }

  set view(view: MistakesView) {
    this.dynamicConfigService.mistakesView = view;
    this.buildGroups();
  }

  lastSeen(date: Date) {
    const days = -daysFromToday(date);

    if (days <= 0) {
      return 'today';
    }

    if (days === 1) {
      return 'yesterday';
    }

    return days <= 30 ? `${days} days ago` : formatDate(date, 'd MMM', 'en-US');
  }

  reviewLabel(lastPracticeDate: Date) {
    const days = daysFromToday(lastPracticeDate) + mistakeMasteredReviewDays;

    if (days <= 0) {
      return 'review due';
    }

    return days === 1 ? 'review tomorrow' : `review in ${days} days`;
  }

  ngOnInit() {
    if (!this.staticConfigService.enableSpeechExercise) {
      this.router.navigate(['/']);
      return;
    }

    this.loadMistakes();
  }

  onSetIgnored(pattern: MistakePattern, isIgnored: boolean) {
    this.isBusy = true;
    this.apiService
      .updateMistake(pattern.id, isIgnored)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (updated) => {
          this.applyPatterns(
            this.patterns.map((item) => (item.id === updated.id ? updated : item)),
          );
        },
        error: (error) => {
          console.error(error.message);
        },
      });
  }

  onDelete(pattern: MistakePattern, panel: PopoverComponent) {
    panel.hide();
    this.isBusy = true;
    this.apiService
      .deleteMistake(pattern.id)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (isDeleted) => {
          if (!isDeleted) {
            return;
          }

          this.soundService.delete();
          this.applyPatterns(this.patterns.filter((item) => item.id !== pattern.id));
        },
        error: (error) => {
          console.error(error.message);
        },
      });
  }

  isExamplesVisible(pattern: MistakePattern) {
    return (
      pattern.isPractisedToday ||
      pattern.progress === MistakeProgressEnum.Ignored ||
      this.revealedIds.has(pattern.id)
    );
  }

  onShowExamples(pattern: MistakePattern) {
    this.revealedIds.add(pattern.id);
  }

  onHideExamples(pattern: MistakePattern) {
    this.revealedIds.delete(pattern.id);
  }

  onToggleIgnored() {
    this.isIgnoredExpanded = !this.isIgnoredExpanded;
  }

  onPractise() {
    if (this.availableCount) {
      this.router.navigate(['/mistakes-exercise']);
    }
  }

  onHome() {
    this.router.navigate(['/']);
  }

  private loadMistakes() {
    this.isBusy = true;
    this.apiService
      .getMistakes()
      .pipe(
        take(1),
        finalize(() => {
          this.isBusy = false;
          this.isLoaded = true;
        }),
      )
      .subscribe({
        next: (patterns) => {
          this.loadError = '';
          this.applyPatterns(patterns);
        },
        error: (error) => {
          this.loadError = 'Could not load mistakes.';
          console.error(error.message);
        },
      });
  }

  private loadAvailableCount() {
    this.apiService
      .getMistakesAvailableCount()
      .pipe(take(1))
      .subscribe({
        next: (count) => (this.availableCount = count),
        error: (error) => console.error(error.message),
      });
  }

  private applyPatterns(patterns: MistakePattern[]) {
    this.loadAvailableCount();
    this.patterns = patterns;
    this.buildGroups();
  }

  private buildGroups() {
    const patterns = this.patterns;
    const time = (date: Date | null) => (date ? new Date(date).getTime() : 0);
    const byProgress = (...progress: MistakeProgressEnum[]) =>
      patterns.filter((item) => progress.includes(item.progress));

    this.ignored = byProgress(MistakeProgressEnum.Ignored).sort(
      (first, second) => time(second.lastOccurrenceDate) - time(first.lastOccurrenceDate),
    );

    if (this.view === 'recent') {
      const periods: MistakeStatusGroup[] = [
        { title: 'Today', patterns: [] },
        { title: 'Yesterday', patterns: [] },
        { title: 'This week', patterns: [] },
        { title: 'Earlier', patterns: [] },
      ];

      for (const pattern of patterns
        .filter((item) => item.progress !== MistakeProgressEnum.Ignored)
        .sort(
          (first, second) => time(second.lastOccurrenceDate) - time(first.lastOccurrenceDate),
        )) {
        const days = pattern.lastOccurrenceDate ? -daysFromToday(pattern.lastOccurrenceDate) : 7;
        periods[days <= 0 ? 0 : days === 1 ? 1 : days < 7 ? 2 : 3].patterns.push(pattern);
      }

      this.groups = periods.filter((group) => group.patterns.length);
      return;
    }

    const groups: MistakeStatusGroup[] = [
      {
        title: 'Learning',
        patterns: byProgress(MistakeProgressEnum.Two, MistakeProgressEnum.One).sort(
          (first, second) =>
            second.progress - first.progress ||
            time(first.lastPracticeDate) - time(second.lastPracticeDate),
        ),
      },
      {
        title: 'New',
        patterns: byProgress(MistakeProgressEnum.New).sort(
          (first, second) => time(first.createdDate) - time(second.createdDate),
        ),
      },
      {
        title: 'Mastered',
        patterns: byProgress(MistakeProgressEnum.Mastered).sort(
          (first, second) => time(first.lastPracticeDate) - time(second.lastPracticeDate),
        ),
      },
    ];

    this.groups = groups.filter((group) => group.patterns.length);
  }
}

function daysFromToday(date: Date) {
  const day = 24 * 60 * 60 * 1000;

  return Math.round(
    (new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / day,
  );
}
