import {
  collection,
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
  TutorAvailabilitySlot,
  TutorBooking,
  TutorBookingFormValues,
  TutorBookingStatus,
  TutorProfile,
  TutorProfileFormValues,
  TutorQualification,
  TutorReview,
  TutorReviewFormValues,
  TutorSubject,
} from "../types/tutor";
import { TUTOR_SUBJECTS } from "../types/tutor";

const profilesCollection = collection(db, "tutorProfiles");
const bookingsCollection = collection(db, "tutorBookings");
const reviewsCollection = collection(db, "tutorReviews");

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

const isTutorSubject = (value: unknown): value is TutorSubject =>
  typeof value === "string" && TUTOR_SUBJECTS.includes(value as TutorSubject);

const normalizeSubjects = (value: unknown): TutorSubject[] => {
  if (!Array.isArray(value)) return ["Mathematics"];
  const subjects = value.filter(isTutorSubject);
  return subjects.length > 0 ? subjects : ["Mathematics"];
};

const normalizeAvailability = (value: unknown): TutorAvailabilitySlot[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((slot): TutorAvailabilitySlot | null => {
      if (!slot || typeof slot !== "object") return null;
      const data = slot as Partial<TutorAvailabilitySlot>;
      if (!data.day || !data.startTime || !data.endTime) return null;

      return {
        id: typeof data.id === "string" ? data.id : createId(),
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
      };
    })
    .filter((slot): slot is TutorAvailabilitySlot => Boolean(slot));
};

const normalizeQualifications = (value: unknown): TutorQualification[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((qualification): TutorQualification | null => {
      if (!qualification || typeof qualification !== "object") return null;
      const data = qualification as Partial<TutorQualification>;
      if (!data.url || !data.path || !data.name) return null;

      return {
        id: typeof data.id === "string" ? data.id : createId(),
        name: data.name,
        url: data.url,
        path: data.path,
        size: typeof data.size === "number" ? data.size : 0,
        contentType: typeof data.contentType === "string" ? data.contentType : "application/octet-stream",
      };
    })
    .filter((qualification): qualification is TutorQualification => Boolean(qualification));
};

const normalizeStatus = (value: unknown): TutorBookingStatus => {
  if (value === "confirmed" || value === "completed" || value === "cancelled") return value;
  return "pending";
};

const uploadQualification = async (file: File, teacherId: string): Promise<TutorQualification> => {
  const path = `tutor-qualifications/${teacherId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const fileRef = ref(storage, path);

  await uploadBytes(fileRef, file, {
    contentType: file.type || "application/octet-stream",
  });

  return {
    id: createId(),
    name: file.name,
    url: await getDownloadURL(fileRef),
    path,
    size: file.size,
    contentType: file.type || "application/octet-stream",
  };
};

const deleteQualification = async (path: string) => {
  if (!path) return;

  try {
    await deleteObject(ref(storage, path));
  } catch {
    // Storage cleanup should not block profile updates if the file is already gone.
  }
};

const removedQualifications = (previous: TutorQualification[], next: TutorQualification[]) => {
  const nextIds = new Set(next.map((qualification) => qualification.id));
  return previous.filter((qualification) => !nextIds.has(qualification.id));
};

const mapProfile = (id: string, data: DocumentData): TutorProfile => ({
  id,
  teacherId: typeof data.teacherId === "string" ? data.teacherId : id,
  teacherEmail: typeof data.teacherEmail === "string" ? data.teacherEmail : "Educor tutor",
  displayName: typeof data.displayName === "string" ? data.displayName : "Educor tutor",
  headline: typeof data.headline === "string" ? data.headline : "",
  bio: typeof data.bio === "string" ? data.bio : "",
  subjects: normalizeSubjects(data.subjects),
  hourlyRate: typeof data.hourlyRate === "number" ? data.hourlyRate : 0,
  availability: normalizeAvailability(data.availability),
  qualifications: normalizeQualifications(data.qualifications),
  active: data.active !== false,
  createdAtMs: toMillis(data.createdAt),
  updatedAtMs: toMillis(data.updatedAt),
});

const mapBooking = (id: string, data: DocumentData): TutorBooking => ({
  id,
  tutorId: typeof data.tutorId === "string" ? data.tutorId : "",
  teacherId: typeof data.teacherId === "string" ? data.teacherId : "",
  teacherEmail: typeof data.teacherEmail === "string" ? data.teacherEmail : "Educor tutor",
  tutorName: typeof data.tutorName === "string" ? data.tutorName : "Educor tutor",
  studentId: typeof data.studentId === "string" ? data.studentId : "",
  studentEmail: typeof data.studentEmail === "string" ? data.studentEmail : "Educor student",
  subject: isTutorSubject(data.subject) ? data.subject : "Mathematics",
  date: typeof data.date === "string" ? data.date : "",
  startTime: typeof data.startTime === "string" ? data.startTime : "",
  durationMinutes: typeof data.durationMinutes === "number" ? data.durationMinutes : 60,
  note: typeof data.note === "string" ? data.note : "",
  status: normalizeStatus(data.status),
  createdAtMs: toMillis(data.createdAt),
  updatedAtMs: toMillis(data.updatedAt),
});

const mapReview = (id: string, data: DocumentData): TutorReview => ({
  id,
  tutorId: typeof data.tutorId === "string" ? data.tutorId : "",
  studentId: typeof data.studentId === "string" ? data.studentId : "",
  studentEmail: typeof data.studentEmail === "string" ? data.studentEmail : "Educor student",
  rating: typeof data.rating === "number" ? data.rating : 5,
  comment: typeof data.comment === "string" ? data.comment : "",
  createdAtMs: toMillis(data.createdAt),
});

export const getTutorProfiles = async (): Promise<TutorProfile[]> => {
  const snapshot = await getDocs(profilesCollection);

  return snapshot.docs
    .map((profileDoc) => mapProfile(profileDoc.id, profileDoc.data()))
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
};

export const getTutorProfileForTeacher = async (teacherId: string): Promise<TutorProfile | null> => {
  const snapshot = await getDocs(query(profilesCollection, where("teacherId", "==", teacherId)));
  const firstProfile = snapshot.docs[0];
  return firstProfile ? mapProfile(firstProfile.id, firstProfile.data()) : null;
};

export const saveTutorProfile = async (
  values: TutorProfileFormValues,
  author: { uid: string; email: string },
  existingProfile?: TutorProfile | null
) => {
  const uploaded = await Promise.all(values.pendingFiles.map((file) => uploadQualification(file, author.uid)));
  const qualifications = [...values.qualifications, ...uploaded];
  const removed = existingProfile ? removedQualifications(existingProfile.qualifications, qualifications) : [];
  const profileId = existingProfile?.id ?? author.uid;

  await setDoc(
    doc(db, "tutorProfiles", profileId),
    {
      teacherId: author.uid,
      teacherEmail: author.email,
      displayName: values.displayName.trim(),
      headline: values.headline.trim(),
      bio: values.bio.trim(),
      subjects: values.subjects,
      hourlyRate: values.hourlyRate,
      availability: values.availability,
      qualifications,
      active: values.active,
      createdAt: existingProfile?.createdAtMs ? new Date(existingProfile.createdAtMs) : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await Promise.all(removed.map((qualification) => deleteQualification(qualification.path)));
};

export const createTutorBooking = async (
  profile: TutorProfile,
  values: TutorBookingFormValues,
  student: { uid: string; email: string }
) => {
  await addDoc(bookingsCollection, {
    tutorId: profile.id,
    teacherId: profile.teacherId,
    teacherEmail: profile.teacherEmail,
    tutorName: profile.displayName,
    studentId: student.uid,
    studentEmail: student.email,
    subject: values.subject,
    date: values.date,
    startTime: values.startTime,
    durationMinutes: values.durationMinutes,
    note: values.note.trim(),
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getTutorBookingsForTeacher = async (teacherId: string): Promise<TutorBooking[]> => {
  const snapshot = await getDocs(query(bookingsCollection, where("teacherId", "==", teacherId)));

  return snapshot.docs
    .map((bookingDoc) => mapBooking(bookingDoc.id, bookingDoc.data()))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
};

export const getTutorBookingsForStudent = async (studentId: string): Promise<TutorBooking[]> => {
  const snapshot = await getDocs(query(bookingsCollection, where("studentId", "==", studentId)));

  return snapshot.docs
    .map((bookingDoc) => mapBooking(bookingDoc.id, bookingDoc.data()))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
};

export const updateTutorBookingStatus = async (booking: TutorBooking, status: TutorBookingStatus) => {
  await updateDoc(doc(db, "tutorBookings", booking.id), {
    status,
    updatedAt: serverTimestamp(),
  });
};

export const getTutorReviews = async (): Promise<TutorReview[]> => {
  const snapshot = await getDocs(reviewsCollection);

  return snapshot.docs
    .map((reviewDoc) => mapReview(reviewDoc.id, reviewDoc.data()))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
};

export const createTutorReview = async (
  profile: TutorProfile,
  values: TutorReviewFormValues,
  student: { uid: string; email: string }
) => {
  await addDoc(reviewsCollection, {
    tutorId: profile.id,
    studentId: student.uid,
    studentEmail: student.email,
    rating: values.rating,
    comment: values.comment.trim(),
    createdAt: serverTimestamp(),
  });
};
