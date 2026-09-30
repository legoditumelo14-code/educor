export type AchievementKind = "badge" | "milestone" | "reward";

export interface AchievementDefinition {
  id: string;
  kind: AchievementKind;
  title: string;
  description: string;
  xp: number;
  requirement: string;
}

export interface AchievementProfile {
  id: string;
  userId: string;
  userEmail: string;
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  leaderboardPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  schoolName: string;
  className: string;
  subjectName: string;
  badgeIds: string[];
  milestoneIds: string[];
  rewardIds: string[];
  updatedAtMs: number;
}

export interface AchievementUnlock {
  id: string;
  kind: AchievementKind;
  title: string;
  description: string;
  xp: number;
}

export interface LeaderboardEntry {
  userId: string;
  userEmail: string;
  level: number;
  xp: number;
  leaderboardPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  schoolName: string;
  className: string;
  subjectName: string;
  badgeCount: number;
}

export interface AchievementDashboardData {
  profile: AchievementProfile;
  badges: AchievementDefinition[];
  milestones: AchievementDefinition[];
  rewards: AchievementDefinition[];
  unlocked: AchievementUnlock[];
  leaderboard: LeaderboardEntry[];
}
