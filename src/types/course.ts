export const COURSE_CATEGORIES = [
  "Mathematics",
  "Science",
  "English",
  "Technology",
  "Business",
  "Creative",
] as const;

export const COURSE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export interface Course {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  duration: string;
  teacherId: string;
  teacherEmail: string;
  thumbnailUrl: string;
  thumbnailPath: string;
  certificateApprovalRequired: boolean;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface CourseFormValues {
  title: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  duration: string;
  certificateApprovalRequired: boolean;
}

export interface CourseFilters {
  search: string;
  category: "All" | CourseCategory;
  level: "All" | CourseLevel;
}

export interface CourseAuthor {
  uid: string;
  email: string;
}
