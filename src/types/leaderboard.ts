export type LeaderboardScope = "school" | "class" | "subject";
export type LeaderboardPeriod = "weekly" | "monthly" | "all_time";

export interface LeaderboardFilters {
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  userEmail: string;
  level: number;
  xp: number;
  leaderboardPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  badgeCount: number;
  schoolName: string;
  className: string;
  subjectName: string;
  score: number;
  isCurrentUser: boolean;
}

export interface LeaderboardChartItem {
  label: string;
  value: number;
  tone?: "green" | "orange" | "blue";
}

export interface LeaderboardDashboardData {
  rows: LeaderboardRow[];
  topRows: LeaderboardRow[];
  currentUserRow: LeaderboardRow | null;
  chartItems: LeaderboardChartItem[];
  scopeLabel: string;
  periodLabel: string;
}
