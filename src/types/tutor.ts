export const TUTOR_SUBJECTS = ["Mathematics", "Science", "English", "Technology", "Business", "Creative"] as const;
export const TUTOR_BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;

export type TutorSubject = (typeof TUTOR_SUBJECTS)[number];
export type TutorBookingStatus = (typeof TUTOR_BOOKING_STATUSES)[number];

export interface TutorQualification {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  contentType: string;
}

export interface TutorAvailabilitySlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

export interface TutorProfile {
  id: string;
  teacherId: string;
  teacherEmail: string;
  displayName: string;
  headline: string;
  bio: string;
  subjects: TutorSubject[];
  hourlyRate: number;
  availability: TutorAvailabilitySlot[];
  qualifications: TutorQualification[];
  active: boolean;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface TutorProfileFormValues {
  displayName: string;
  headline: string;
  bio: string;
  subjects: TutorSubject[];
  hourlyRate: number;
  availability: TutorAvailabilitySlot[];
  qualifications: TutorQualification[];
  pendingFiles: File[];
  active: boolean;
}

export interface TutorBooking {
  id: string;
  tutorId: string;
  teacherId: string;
  teacherEmail: string;
  tutorName: string;
  studentId: string;
  studentEmail: string;
  subject: TutorSubject;
  date: string;
  startTime: string;
  durationMinutes: number;
  note: string;
  status: TutorBookingStatus;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface TutorBookingFormValues {
  subject: TutorSubject;
  date: string;
  startTime: string;
  durationMinutes: number;
  note: string;
}

export interface TutorReview {
  id: string;
  tutorId: string;
  studentId: string;
  studentEmail: string;
  rating: number;
  comment: string;
  createdAtMs: number;
}

export interface TutorReviewFormValues {
  rating: number;
  comment: string;
}

export interface TutorFilters {
  search: string;
  subject: "All" | TutorSubject;
  maxRate: number;
}
