export const ASSIGNMENT_RESOURCE_TYPES = ["pdf", "image", "video", "document", "other"] as const;
export const SUBMISSION_STATUSES = ["not_submitted", "draft", "submitted", "late", "graded"] as const;

export type AssignmentResourceType = (typeof ASSIGNMENT_RESOURCE_TYPES)[number];
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface AssignmentResource {
  id: string;
  name: string;
  type: AssignmentResourceType;
  url: string;
  path: string;
  size: number;
  contentType: string;
}

export interface Assignment {
  id: string;
  title: string;
  instructions: string;
  dueDate: string;
  maxMarks: number;
  teacherId: string;
  teacherEmail: string;
  resources: AssignmentResource[];
  createdAtMs: number;
  updatedAtMs: number;
}

export interface AssignmentFormValues {
  title: string;
  instructions: string;
  dueDate: string;
  maxMarks: number;
  resources: AssignmentResource[];
  pendingFiles: File[];
}

export interface AssignmentAuthor {
  uid: string;
  email: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentEmail: string;
  note: string;
  resources: AssignmentResource[];
  status: SubmissionStatus;
  submittedAtMs: number;
  updatedAtMs: number;
  marksAwarded: number | null;
  feedback: string;
  teacherComment: string;
}

export interface SubmissionFormValues {
  note: string;
  resources: AssignmentResource[];
  pendingFiles: File[];
}
