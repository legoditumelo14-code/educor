export type ProgressRole = "student" | "teacher";
export type ActivityKind = "course" | "lesson" | "assignment" | "quiz" | "certificate";

export interface ProgressMetric {
  label: string;
  value: string;
  helper: string;
}

export interface WeeklyStudyPoint {
  label: string;
  minutes: number;
}

export interface ProgressChartItem {
  label: string;
  value: number;
  tone?: "green" | "orange" | "blue";
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
}

export interface ProgressActivity {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  occurredAtMs: number;
}

export interface ProgressDashboardData {
  role: ProgressRole;
  courseCompletionPercent: number;
  completedCourses: number;
  totalCourses: number;
  weeklyStudyMinutes: number;
  weeklyStudy: WeeklyStudyPoint[];
  learningStreakDays: number;
  assignmentCompletionPercent: number;
  completedAssignments: number;
  totalAssignments: number;
  quizAveragePercent: number;
  quizAttempts: number;
  achievementBadges: AchievementBadge[];
  activity: ProgressActivity[];
  charts: {
    completion: ProgressChartItem[];
    performance: ProgressChartItem[];
  };
}
