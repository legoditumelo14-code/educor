import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  addDoc,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import type {
  Lesson,
  LessonAuthor,
  LessonFormValues,
  LessonProgress,
  LessonResource,
  LessonResourceType,
  LessonSection,
  LessonSectionDraft,
  LessonStatus,
} from "../types/lesson";

const lessonsCollection = collection(db, "lessons");
const progressCollection = collection(db, "lessonProgress");

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

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getResourceType = (file: File): LessonResourceType => {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return "pdf";
};

const uploadLessonResource = async (file: File, teacherId: string, lessonKey: string): Promise<LessonResource> => {
  const id = createId();
  const path = `lesson-files/${teacherId}/${lessonKey}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const fileRef = ref(storage, path);

  await uploadBytes(fileRef, file, {
    contentType: file.type || "application/octet-stream",
  });

  return {
    id,
    name: file.name,
    type: getResourceType(file),
    url: await getDownloadURL(fileRef),
    path,
    size: file.size,
    contentType: file.type || "application/octet-stream",
  };
};

const deleteResource = async (path: string) => {
  if (!path) return;

  try {
    await deleteObject(ref(storage, path));
  } catch {
    // Storage cleanup should not block lesson data changes if a file is already gone.
  }
};

const normalizeResources = (resources: unknown): LessonResource[] => {
  if (!Array.isArray(resources)) return [];

  return resources
    .map((resource): LessonResource | null => {
      if (!resource || typeof resource !== "object") return null;
      const data = resource as Partial<LessonResource>;

      if (!data.url || !data.path || !data.name) return null;

      return {
        id: typeof data.id === "string" ? data.id : createId(),
        name: data.name,
        type: data.type === "video" || data.type === "image" || data.type === "pdf" ? data.type : "pdf",
        url: data.url,
        path: data.path,
        size: typeof data.size === "number" ? data.size : 0,
        contentType: typeof data.contentType === "string" ? data.contentType : "application/octet-stream",
      };
    })
    .filter((resource): resource is LessonResource => Boolean(resource));
};

const normalizeSections = (data: DocumentData): LessonSection[] => {
  if (Array.isArray(data.sections) && data.sections.length > 0) {
    return data.sections
      .map((section: unknown, index: number): LessonSection => {
        const sectionData = (section ?? {}) as Partial<LessonSection>;

        return {
          id: typeof sectionData.id === "string" ? sectionData.id : createId(),
          title: typeof sectionData.title === "string" ? sectionData.title : `Section ${index + 1}`,
          body: typeof sectionData.body === "string" ? sectionData.body : "",
          order: typeof sectionData.order === "number" ? sectionData.order : index,
          resources: normalizeResources(sectionData.resources),
        };
      })
      .sort((a, b) => a.order - b.order);
  }

  return [
    {
      id: createId(),
      title: "Lesson content",
      body: typeof data.content === "string" ? data.content : "",
      order: 0,
      resources: [],
    },
  ];
};

const mapLesson = (id: string, data: DocumentData): Lesson => {
  const status: LessonStatus = data.status === "draft" || data.status === "published" ? data.status : "published";

  return {
    id,
    title: typeof data.title === "string" ? data.title : "Untitled lesson",
    summary: typeof data.summary === "string" ? data.summary : typeof data.content === "string" ? data.content.slice(0, 140) : "",
    status,
    teacherId: typeof data.teacherId === "string" ? data.teacherId : typeof data.createdBy === "string" ? data.createdBy : "",
    teacherEmail: typeof data.teacherEmail === "string" ? data.teacherEmail : "Educor teacher",
    sections: normalizeSections(data),
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
    publishedAtMs: toMillis(data.publishedAt),
  };
};

const prepareSections = async (
  sections: LessonSectionDraft[],
  teacherId: string,
  lessonKey: string
): Promise<LessonSection[]> => {
  const prepared = await Promise.all(
    sections.map(async (section, index) => {
      const uploaded = await Promise.all(
        section.pendingFiles.map((file) => uploadLessonResource(file, teacherId, lessonKey))
      );

      return {
        id: section.id || createId(),
        title: section.title.trim() || `Section ${index + 1}`,
        body: section.body.trim(),
        order: index,
        resources: [...section.resources, ...uploaded],
      };
    })
  );

  return prepared;
};

const removedResources = (previous: LessonSection[], next: LessonSection[]) => {
  const nextIds = new Set(next.flatMap((section) => section.resources.map((resource) => resource.id)));

  return previous.flatMap((section) => section.resources.filter((resource) => !nextIds.has(resource.id)));
};

export const getLessons = async (): Promise<Lesson[]> => {
  const snapshot = await getDocs(lessonsCollection);

  return snapshot.docs
    .map((lessonDoc) => mapLesson(lessonDoc.id, lessonDoc.data()))
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
};

export const createLesson = async (values: LessonFormValues, author: LessonAuthor) => {
  const lessonKey = createId();
  const sections = await prepareSections(values.sections, author.uid, lessonKey);

  await addDoc(lessonsCollection, {
    title: values.title.trim(),
    summary: values.summary.trim(),
    status: values.status,
    teacherId: author.uid,
    teacherEmail: author.email,
    sections,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: values.status === "published" ? serverTimestamp() : null,
  });
};

export const updateLesson = async (lesson: Lesson, values: LessonFormValues) => {
  const sections = await prepareSections(values.sections, lesson.teacherId || "shared", lesson.id);
  const resourcesToDelete = removedResources(lesson.sections, sections);

  await updateDoc(doc(db, "lessons", lesson.id), {
    title: values.title.trim(),
    summary: values.summary.trim(),
    status: values.status,
    sections,
    updatedAt: serverTimestamp(),
    ...(values.status === "published" && !lesson.publishedAtMs ? { publishedAt: serverTimestamp() } : {}),
  });

  await Promise.all(resourcesToDelete.map((resource) => deleteResource(resource.path)));
};

export const deleteLesson = async (lesson: Lesson) => {
  await deleteDoc(doc(db, "lessons", lesson.id));
  await Promise.all(lesson.sections.flatMap((section) => section.resources.map((resource) => deleteResource(resource.path))));
};

export const publishLesson = async (lesson: Lesson) => {
  await updateDoc(doc(db, "lessons", lesson.id), {
    status: "published",
    publishedAt: lesson.publishedAtMs ? lesson.publishedAtMs : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getLessonProgress = async (studentId: string): Promise<Record<string, LessonProgress>> => {
  const progressQuery = query(progressCollection, where("studentId", "==", studentId));
  const snapshot = await getDocs(progressQuery);

  return snapshot.docs.reduce<Record<string, LessonProgress>>((progressMap, progressDoc) => {
    const data = progressDoc.data();
    const lessonId = typeof data.lessonId === "string" ? data.lessonId : "";

    if (!lessonId) return progressMap;

    progressMap[lessonId] = {
      id: progressDoc.id,
      lessonId,
      studentId,
      progressPercent: typeof data.progressPercent === "number" ? data.progressPercent : 0,
      completed: Boolean(data.completed),
      completedSectionIds: Array.isArray(data.completedSectionIds)
        ? data.completedSectionIds.filter((id): id is string => typeof id === "string")
        : [],
      updatedAtMs: toMillis(data.updatedAt),
    };

    return progressMap;
  }, {});
};

export const getAllLessonProgress = async (): Promise<LessonProgress[]> => {
  const snapshot = await getDocs(progressCollection);

  return snapshot.docs.map((progressDoc) => {
    const data = progressDoc.data();

    return {
      id: progressDoc.id,
      lessonId: typeof data.lessonId === "string" ? data.lessonId : "",
      studentId: typeof data.studentId === "string" ? data.studentId : "",
      progressPercent: typeof data.progressPercent === "number" ? data.progressPercent : 0,
      completed: Boolean(data.completed),
      completedSectionIds: Array.isArray(data.completedSectionIds)
        ? data.completedSectionIds.filter((id): id is string => typeof id === "string")
        : [],
      updatedAtMs: toMillis(data.updatedAt),
    };
  });
};

export const saveLessonProgress = async (
  lesson: Lesson,
  studentId: string,
  completedSectionIds: string[]
) => {
  const totalSections = Math.max(lesson.sections.length, 1);
  const progressPercent = Math.round((completedSectionIds.length / totalSections) * 100);
  const completed = progressPercent >= 100;
  const progressId = `${studentId}_${lesson.id}`;

  await setDoc(
    doc(db, "lessonProgress", progressId),
    {
      lessonId: lesson.id,
      studentId,
      progressPercent,
      completed,
      completedSectionIds,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    id: progressId,
    lessonId: lesson.id,
    studentId,
    progressPercent,
    completed,
    completedSectionIds,
    updatedAtMs: Date.now(),
  } satisfies LessonProgress;
};
