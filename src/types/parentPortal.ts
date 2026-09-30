import type { Assignment, AssignmentSubmission } from "./assignment";
import type { MessageConversation } from "./messaging";
import type { ProgressDashboardData } from "./progress";

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export const PARENT_NOTIFICATION_TYPES = ["progress", "attendance", "assignment", "message"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type ParentNotificationType = (typeof PARENT_NOTIFICATION_TYPES)[number];

export interface ParentLearner {
  id: string;
  parentId: string;
  studentId: string;
  studentEmail: string;
  displayName: string;
  gradeLevel: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  note: string;
  recordedBy: string;
  createdAtMs: number;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercent: number;
}

export interface ParentNotification {
  id: string;
  parentId: string;
  studentId: string;
  type: ParentNotificationType;
  title: string;
  message: string;
  createdAtMs: number;
  read: boolean;
}

export interface ParentPortalData {
  learners: ParentLearner[];
  selectedLearner: ParentLearner | null;
  progress: ProgressDashboardData | null;
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  attendance: AttendanceRecord[];
  attendanceSummary: AttendanceSummary;
  notifications: ParentNotification[];
  teacherThreads: MessageConversation[];
}
