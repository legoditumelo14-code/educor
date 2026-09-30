import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import {
  COURSE_CATEGORIES,
  COURSE_LEVELS,
  type Course,
  type CourseAuthor,
  type CourseCategory,
  type CourseFormValues,
  type CourseLevel,
} from "../types/course";

const coursesCollection = collection(db, "courses");

const fallbackThumbnail = "";

const isCourseCategory = (value: unknown): value is CourseCategory =>
  typeof value === "string" && COURSE_CATEGORIES.includes(value as CourseCategory);

const isCourseLevel = (value: unknown): value is CourseLevel =>
  typeof value === "string" && COURSE_LEVELS.includes(value as CourseLevel);

const toMillis = (value: unknown) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();

  const maybeTimestamp = value as Partial<Timestamp>;
  if (typeof maybeTimestamp.toMillis === "function") {
    return maybeTimestamp.toMillis();
  }

  return 0;
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

const uploadThumbnail = async (file: File, teacherId: string) => {
  const path = `course-thumbnails/${teacherId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const thumbnailRef = ref(storage, path);

  await uploadBytes(thumbnailRef, file, {
    contentType: file.type || "image/jpeg",
  });

  const url = await getDownloadURL(thumbnailRef);

  return { path, url };
};

const deleteThumbnail = async (thumbnailPath: string) => {
  if (!thumbnailPath) return;

  try {
    await deleteObject(ref(storage, thumbnailPath));
  } catch {
    // Storage cleanup should not block course CRUD if the file was already removed.
  }
};

const mapCourse = (id: string, data: DocumentData): Course => ({
  id,
  title: typeof data.title === "string" ? data.title : "Untitled course",
  description: typeof data.description === "string" ? data.description : "",
  category: isCourseCategory(data.category) ? data.category : "Technology",
  level: isCourseLevel(data.level) ? data.level : "Beginner",
  duration: typeof data.duration === "string" ? data.duration : "Self-paced",
  teacherId: typeof data.teacherId === "string" ? data.teacherId : "",
  teacherEmail: typeof data.teacherEmail === "string" ? data.teacherEmail : "Educor teacher",
  thumbnailUrl: typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : fallbackThumbnail,
  thumbnailPath: typeof data.thumbnailPath === "string" ? data.thumbnailPath : "",
  certificateApprovalRequired: Boolean(data.certificateApprovalRequired),
  createdAtMs: toMillis(data.createdAt),
  updatedAtMs: toMillis(data.updatedAt),
});

export const getCourses = async (): Promise<Course[]> => {
  const snapshot = await getDocs(coursesCollection);

  return snapshot.docs
    .map((courseDoc) => mapCourse(courseDoc.id, courseDoc.data()))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
};

export const createCourse = async (
  values: CourseFormValues,
  author: CourseAuthor,
  thumbnail?: File | null
) => {
  const uploaded = thumbnail ? await uploadThumbnail(thumbnail, author.uid) : null;

  await addDoc(coursesCollection, {
    ...values,
    teacherId: author.uid,
    teacherEmail: author.email,
    thumbnailUrl: uploaded?.url ?? fallbackThumbnail,
    thumbnailPath: uploaded?.path ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateCourse = async (
  course: Course,
  values: CourseFormValues,
  thumbnail?: File | null
) => {
  const uploaded = thumbnail ? await uploadThumbnail(thumbnail, course.teacherId || "shared") : null;

  await updateDoc(doc(db, "courses", course.id), {
    ...values,
    ...(uploaded
      ? {
          thumbnailUrl: uploaded.url,
          thumbnailPath: uploaded.path,
        }
      : {}),
    updatedAt: serverTimestamp(),
  });

  if (uploaded && course.thumbnailPath) {
    await deleteThumbnail(course.thumbnailPath);
  }
};

export const deleteCourse = async (course: Course) => {
  await deleteDoc(doc(db, "courses", course.id));
  await deleteThumbnail(course.thumbnailPath);
};
