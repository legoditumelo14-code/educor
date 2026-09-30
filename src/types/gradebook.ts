import type { SubmissionStatus } from "./assignment";

export type GradebookStatusFilter = "All" | SubmissionStatus;

export interface GradebookFilters {
  search: string;
  status: GradebookStatusFilter;
  assignmentId: string;
}

export interface GradebookRow {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  dueDate: string;
  maxMarks: number;
  studentId: string;
  studentEmail: string;
  status: SubmissionStatus;
  submittedAtMs: number;
  updatedAtMs: number;
  marksAwarded: number | null;
  feedback: string;
  teacherComment: string;
  percentage: number | null;
}

export interface GradebookSummary {
  totalRows: number;
  gradedRows: number;
  submittedRows: number;
  averagePercentage: number;
  highestPercentage: number;
  needsGrading: number;
}

export interface GradebookChartItem {
  label: string;
  value: number;
  tone?: "green" | "orange" | "blue";
}

export interface GradeUpdateValues {
  marksAwarded: number;
  feedback: string;
  teacherComment: string;
}
