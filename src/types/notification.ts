export const NOTIFICATION_TYPES = [
  "announcement",
  "assignment_reminder",
  "quiz_reminder",
  "course_update",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationItem {
  id: string;
  sourceId: string;
  type: NotificationType;
  title: string;
  message: string;
  detail: string;
  createdAtMs: number;
  read: boolean;
}

export interface NotificationSettings {
  announcements: boolean;
  assignmentReminders: boolean;
  quizReminders: boolean;
  courseUpdates: boolean;
}

export interface NotificationCentreData {
  notifications: NotificationItem[];
  settings: NotificationSettings;
  unreadCount: number;
}
