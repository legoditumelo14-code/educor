export const CERTIFICATE_STATUSES = ["pending", "approved"] as const;

export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];

export interface CertificateRecipient {
  uid: string;
  email: string;
}

export interface CourseCertificate {
  id: string;
  verificationId: string;
  status: CertificateStatus;
  courseId: string;
  courseTitle: string;
  courseCategory: string;
  courseLevel: string;
  teacherId: string;
  teacherEmail: string;
  studentId: string;
  studentEmail: string;
  completedAtMs: number;
  issuedAtMs: number;
  approvedAtMs: number;
  approvedBy: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface CourseCompletion {
  id: string;
  courseId: string;
  studentId: string;
  studentEmail: string;
  completedAtMs: number;
}
