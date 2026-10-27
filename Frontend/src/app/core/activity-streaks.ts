import {
  UserStatisticsCalendar,
  UserStatisticsCalendarDay,
} from '../models/user-statistics-calendar';

export function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

export function getPeriodStart(to: Date, months: number): Date {
  return addDays(addMonths(to, -months), 1);
}

export function getGoalFlags(
  calendar: UserStatisticsCalendar,
  from: Date,
  isGoal: (day: UserStatisticsCalendarDay | undefined) => boolean,
): boolean[] {
  const days = new Map(calendar.days.map((d) => [d.date, d]));
  const to = parseDate(calendar.to);
  const flags: boolean[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    flags.push(isGoal(days.get(formatDate(date))));
  }
  return flags;
}

export function getLongestStreak(flags: boolean[]): number {
  let longestStreak = 0;
  let streak = 0;
  for (const isGoal of flags) {
    streak = isGoal ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
  }
  return longestStreak;
}

export function getCurrentStreak(flags: boolean[]): number {
  let currentStreak = 0;
  let index = flags.length - 1;
  if (index >= 0 && !flags[index]) {
    index--;
  }
  while (index >= 0 && flags[index]) {
    currentStreak++;
    index--;
  }
  return currentStreak;
}
