import { getAchievementProfiles } from "./achievements";
import type { AchievementProfile } from "../types/achievement";
import type {
  LeaderboardDashboardData,
  LeaderboardFilters,
  LeaderboardPeriod,
  LeaderboardRow,
  LeaderboardScope,
} from "../types/leaderboard";

const periodLabels: Record<LeaderboardPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  all_time: "All-time",
};

const scopeLabels: Record<LeaderboardScope, string> = {
  school: "School",
  class: "Class",
  subject: "Subject",
};

const scoreForPeriod = (profile: AchievementProfile, period: LeaderboardPeriod) => {
  if (period === "weekly") return profile.weeklyPoints;
  if (period === "monthly") return profile.monthlyPoints;
  return profile.leaderboardPoints;
};

const scopeValue = (profile: AchievementProfile, scope: LeaderboardScope) => {
  if (scope === "class") return profile.className;
  if (scope === "subject") return profile.subjectName;
  return profile.schoolName;
};

const fallbackScopeName = (scope: LeaderboardScope) => {
  if (scope === "class") return "General Class";
  if (scope === "subject") return "General Studies";
  return "Educor School";
};

const toRows = (
  profiles: AchievementProfile[],
  filters: LeaderboardFilters,
  userId: string
): LeaderboardRow[] =>
  profiles
    .map((profile) => ({
      rank: 0,
      userId: profile.userId,
      userEmail: profile.userEmail,
      level: profile.level,
      xp: profile.xp,
      leaderboardPoints: profile.leaderboardPoints,
      weeklyPoints: profile.weeklyPoints,
      monthlyPoints: profile.monthlyPoints,
      badgeCount: profile.badgeIds.length,
      schoolName: profile.schoolName,
      className: profile.className,
      subjectName: profile.subjectName,
      score: scoreForPeriod(profile, filters.period),
      isCurrentUser: profile.userId === userId,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.level !== a.level) return b.level - a.level;
      return b.badgeCount - a.badgeCount;
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));

export const getLeaderboardDashboard = async (
  userId: string,
  filters: LeaderboardFilters
): Promise<LeaderboardDashboardData> => {
  const profiles = await getAchievementProfiles();
  const currentProfile = profiles.find((profile) => profile.userId === userId);
  const selectedScopeValue = currentProfile ? scopeValue(currentProfile, filters.scope) : fallbackScopeName(filters.scope);
  const scopedProfiles = profiles.filter((profile) => scopeValue(profile, filters.scope) === selectedScopeValue);
  const rows = toRows(scopedProfiles.length ? scopedProfiles : profiles, filters, userId);
  const topRows = rows.slice(0, 5);
  const currentUserRow = rows.find((row) => row.userId === userId) ?? null;

  return {
    rows,
    topRows,
    currentUserRow,
    chartItems: topRows.map((row, index) => ({
      label: row.userEmail.split("@")[0] || `Rank ${row.rank}`,
      value: row.score,
      tone: index === 0 ? "orange" : index === 1 ? "blue" : "green",
    })),
    scopeLabel: `${scopeLabels[filters.scope]}: ${selectedScopeValue}`,
    periodLabel: periodLabels[filters.period],
  };
};
