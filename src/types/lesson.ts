export const LESSON_RESOURCE_TYPES = ["pdf", "video", "image"] as const;
export const LESSON_STATUSES = ["draft", "published"] as const;

export type LessonResourceType = (typeof LESSON_RESOURCE_TYPES)[number];
export type LessonStatus = (typeof LESSON_STATUSES)[number];

export interface LessonResource {
  id: string;
  name: string;
  type: LessonResourceType;
  url: string;
  path: string;
  size: number;
  contentType: string;
}

export interface LessonSection {
  id: string;
  title: string;
  body: string;
  order: number;
  resources: LessonResource[];
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  status: LessonStatus;
  teacherId: string;
  teacherEmail: string;
  sections: LessonSection[];
  createdAtMs: number;
  updatedAtMs: number;
  publishedAtMs: number;
}

export interface LessonSectionDraft extends LessonSection {
  pendingFiles: File[];
}

export interface LessonFormValues {
  title: string;
  summary: string;
  status: LessonStatus;
  sections: LessonSectionDraft[];
}

export interface LessonAuthor {
  uid: string;
  email: string;
}

export interface LessonProgress {
  id: string;
  lessonId: string;
  studentId: string;
  progressPercent: number;
  completed: boolean;
  completedSectionIds: string[];
  updatedAtMs: number;
}
