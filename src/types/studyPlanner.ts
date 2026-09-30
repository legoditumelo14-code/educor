export const STUDY_PLANNER_TYPES = ["daily", "weekly", "revision"] as const;
export const STUDY_TASK_PRIORITIES = ["low", "medium", "high"] as const;

export type StudyPlannerType = (typeof STUDY_PLANNER_TYPES)[number];
export type StudyTaskPriority = (typeof STUDY_TASK_PRIORITIES)[number];

export interface StudyTask {
  id: string;
  userId: string;
  title: string;
  description: string;
  subject: string;
  plannerType: StudyPlannerType;
  date: string;
  startTime: string;
  endTime: string;
  priority: StudyTaskPriority;
  completed: boolean;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface StudyTaskFormValues {
  title: string;
  description: string;
  subject: string;
  plannerType: StudyPlannerType;
  date: string;
  startTime: string;
  endTime: string;
  priority: StudyTaskPriority;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
}

export interface StudyPlannerSummary {
  total: number;
  completed: number;
  pending: number;
  highPriority: number;
  reminderCount: number;
}
