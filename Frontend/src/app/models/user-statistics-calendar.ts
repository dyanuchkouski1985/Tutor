export class UserStatisticsCalendarDay {
  date: string;
  percentage: number;
  conversationPercentage: number;
}

export class UserStatisticsCalendar {
  from: string;
  to: string;
  dailyGoalPoints: number;
  conversationMaxDailyPoints: number;
  days: UserStatisticsCalendarDay[];
}
