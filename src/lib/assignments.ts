import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import type {
  Assignment,
  AssignmentAuthor,
  AssignmentFormValues,
  AssignmentResource,
  AssignmentResourceType,
  AssignmentSubmission,
  SubmissionFormValues,
  SubmissionStatus,
} from "../types/assignment";

const assignmentsCollection = collection(db, "assignments");
const submissionsCollection = collection(db, "assignmentSubmissions");

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

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

const getResourceType = (file: File): AssignmentResourceType => {
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.includes("document") || file.type.includes("word") || file.type.includes("text")) return "document";
  return "other";
};

const uploadResource = async (
  file: File,
  ownerId: string,
  folder: "assignment-files" | "submission-files",
  parentId: string
): Promise<AssignmentResource> => {
  const path = `${folder}/${ownerId}/${parentId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const fileRef = ref(storage, path);

  await uploadBytes(fileRef, file, {
    contentType: file.type || "application/octet-stream",
  });

  return {
    id: createId(),
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
    // File cleanup should not block assignment data changes if Storage is already clean.
  }
};

const normalizeResources = (resources: unknown): AssignmentResource[] => {
  if (!Array.isArray(resources)) return [];

  return resources
    .map((resource): AssignmentResource | null => {
      if (!resource || typeof resource !== "object") return null;
      const data = resource as Partial<AssignmentResource>;

      if (!data.url || !data.path || !data.name) return null;

      return {
        id: typeof data.id === "string" ? data.id : createId(),
        name: data.name,
        type:
          data.type === "pdf" ||
          data.type === "image" ||
          data.type === "video" ||
          data.type === "document" ||
          data.type === "other"
            ? data.type
            : "other",
        url: data.url,
        path: data.path,
        size: typeof data.size === "number" ? data.size : 0,
        contentType: typeof data.contentType === "string" ? data.contentType : "application/octet-stream",
      };
    })
    .filter((resource): resource is AssignmentResource => Boolean(resource));
};

const normalizeStatus = (value: unknown): SubmissionStatus => {
  if (value === "draft" || value === "submitted" || value === "late" || value === "graded") return value;
  return "not_submitted";
};

const mapAssignment = (id: string, data: DocumentData): Assignment => ({
  id,
  title: typeof data.title === "string" ? data.title : "Untitled assignment",
  instructions:
    typeof data.instructions === "string"
      ? data.instructions
      : typeof data.description === "string"
        ? data.description
        : "",
  dueDate: typeof data.dueDate === "string" ? data.dueDate : "",
  maxMarks: typeof data.maxMarks === "number" ? data.maxMarks : 100,
  teacherId: typeof data.teacherId === "string" ? data.teacherId : typeof data.createdBy === "string" ? data.createdBy : "",
  teacherEmail: typeof data.teacherEmail === "string" ? data.teacherEmail : "Educor teacher",
  resources: normalizeResources(data.resources),
  createdAtMs: toMillis(data.createdAt),
  updatedAtMs: toMillis(data.updatedAt),
});

const mapSubmission = (id: string, data: DocumentData): AssignmentSubmission => ({
  id,
  assignmentId: typeof data.assignmentId === "string" ? data.assignmentId : "",
  studentId: typeof data.studentId === "string" ? data.studentId : "",
  studentEmail: typeof data.studentEmail === "string" ? data.studentEmail : "Educor student",
  note: typeof data.note === "string" ? data.note : "",
  resources: normalizeResources(data.resources),
  status: normalizeStatus(data.status),
  submittedAtMs: toMillis(data.submittedAt),
  updatedAtMs: toMillis(data.updatedAt),
  marksAwarded: typeof data.marksAwarded === "number" ? data.marksAwarded : null,
  feedback: typeof data.feedback === "string" ? data.feedback : "",
  teacherComment: typeof data.teacherComment === "string" ? data.teacherComment : "",
});

const removedResources = (previous: AssignmentResource[], next: AssignmentResource[]) => {
  const nextIds = new Set(next.map((resource) => resource.id));
  return previous.filter((resource) => !nextIds.has(resource.id));
};

const isPastDue = (dueDate: string) => {
  if (!dueDate) return false;
  const due = new Date(`${dueDate}T23:59:59`);
  return Number.isFinite(due.getTime()) && Date.now() > due.getTime();
};

export const isAssignmentPastDue = isPastDue;

export const getAssignments = async (): Promise<Assignment[]> => {
  const snapshot = await getDocs(assignmentsCollection);

  return snapshot.docs
    .map((assignmentDoc) => mapAssignment(assignmentDoc.id, assignmentDoc.data()))
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
};

export const createAssignment = async (values: AssignmentFormValues, author: AssignmentAuthor) => {
  const assignmentKey = createId();
  const uploaded = await Promise.all(
    values.pendingFiles.map((file) => uploadResource(file, author.uid, "assignment-files", assignmentKey))
  );

  await addDoc(assignmentsCollection, {
    title: values.title.trim(),
    instructions: values.instructions.trim(),
    dueDate: values.dueDate,
    maxMarks: values.maxMarks,
    teacherId: author.uid,
    teacherEmail: author.email,
    resources: [...values.resources, ...uploaded],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateAssignment = async (assignment: Assignment, values: AssignmentFormValues) => {
  const uploaded = await Promise.all(
    values.pendingFiles.map((file) => uploadResource(file, assignment.teacherId || "shared", "assignment-files", assignment.id))
  );
  const resources = [...values.resources, ...uploaded];
  const resourcesToDelete = removedResources(assignment.resources, resources);

  await updateDoc(doc(db, "assignments", assignment.id), {
    title: values.title.trim(),
    instructions: values.instructions.trim(),
    dueDate: values.dueDate,
    maxMarks: values.maxMarks,
    resources,
    updatedAt: serverTimestamp(),
  });

  await Promise.all(resourcesToDelete.map((resource) => deleteResource(resource.path)));
};

export const deleteAssignment = async (assignment: Assignment) => {
  const submissions = await getSubmissionsForAssignment(assignment.id);

  await deleteDoc(doc(db, "assignments", assignment.id));

  await Promise.all([
    ...assignment.resources.map((resource) => deleteResource(resource.path)),
    ...submissions.map(async (submission) => {
      await deleteDoc(doc(db, "assignmentSubmissions", submission.id));
      await Promise.all(submission.resources.map((resource) => deleteResource(resource.path)));
    }),
  ]);
};

export const getSubmissionsForStudent = async (studentId: string): Promise<Record<string, AssignmentSubmission>> => {
  const submissionsQuery = query(submissionsCollection, where("studentId", "==", studentId));
  const snapshot = await getDocs(submissionsQuery);

  return snapshot.docs.reduce<Record<string, AssignmentSubmission>>((submissionMap, submissionDoc) => {
    const submission = mapSubmission(submissionDoc.id, submissionDoc.data());
    if (submission.assignmentId) {
      submissionMap[submission.assignmentId] = submission;
    }

    return submissionMap;
  }, {});
};

export const getSubmissionsForAssignment = async (assignmentId: string): Promise<AssignmentSubmission[]> => {
  const submissionsQuery = query(submissionsCollection, where("assignmentId", "==", assignmentId));
  const snapshot = await getDocs(submissionsQuery);

  return snapshot.docs.map((submissionDoc) => mapSubmission(submissionDoc.id, submissionDoc.data()));
};

export const getAllAssignmentSubmissions = async (): Promise<AssignmentSubmission[]> => {
  const snapshot = await getDocs(submissionsCollection);

  return snapshot.docs.map((submissionDoc) => mapSubmission(submissionDoc.id, submissionDoc.data()));
};

export const saveSubmissionDraft = async (
  assignment: Assignment,
  values: SubmissionFormValues,
  student: AssignmentAuthor,
  existingSubmission?: AssignmentSubmission
) => {
  if (isPastDue(assignment.dueDate)) {
    throw new Error("Deadline passed");
  }

  const submissionId = existingSubmission?.id ?? `${student.uid}_${assignment.id}`;
  const uploaded = await Promise.all(
    values.pendingFiles.map((file) => uploadResource(file, student.uid, "submission-files", assignment.id))
  );
  const resources = [...values.resources, ...uploaded];
  const resourcesToDelete = existingSubmission ? removedResources(existingSubmission.resources, resources) : [];

  await setDoc(
    doc(db, "assignmentSubmissions", submissionId),
    {
      assignmentId: assignment.id,
      studentId: student.uid,
      studentEmail: student.email,
      note: values.note.trim(),
      resources,
      status: "draft",
      updatedAt: serverTimestamp(),
      marksAwarded: existingSubmission?.marksAwarded ?? null,
      feedback: existingSubmission?.feedback ?? "",
      teacherComment: existingSubmission?.teacherComment ?? "",
    },
    { merge: true }
  );

  await Promise.all(resourcesToDelete.map((resource) => deleteResource(resource.path)));
};

export const submitAssignment = async (
  assignment: Assignment,
  values: SubmissionFormValues,
  student: AssignmentAuthor,
  existingSubmission?: AssignmentSubmission
) => {
  const submissionId = existingSubmission?.id ?? `${student.uid}_${assignment.id}`;
  const uploaded = await Promise.all(
    values.pendingFiles.map((file) => uploadResource(file, student.uid, "submission-files", assignment.id))
  );
  const resources = [...values.resources, ...uploaded];
  const resourcesToDelete = existingSubmission ? removedResources(existingSubmission.resources, resources) : [];
  const status: SubmissionStatus = isPastDue(assignment.dueDate) ? "late" : "submitted";

  await setDoc(
    doc(db, "assignmentSubmissions", submissionId),
    {
      assignmentId: assignment.id,
      studentId: student.uid,
      studentEmail: student.email,
      note: values.note.trim(),
      resources,
      status,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      marksAwarded: existingSubmission?.marksAwarded ?? null,
      feedback: existingSubmission?.feedback ?? "",
      teacherComment: existingSubmission?.teacherComment ?? "",
    },
    { merge: true }
  );

  await Promise.all(resourcesToDelete.map((resource) => deleteResource(resource.path)));
};

export const gradeSubmission = async (
  submission: AssignmentSubmission,
  marksAwarded: number,
  feedback: string,
  teacherComment = submission.teacherComment
) => {
  await updateDoc(doc(db, "assignmentSubmissions", submission.id), {
    marksAwarded,
    feedback: feedback.trim(),
    teacherComment: teacherComment.trim(),
    status: "graded",
    updatedAt: serverTimestamp(),
  });
};
