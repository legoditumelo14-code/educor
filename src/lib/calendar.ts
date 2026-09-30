import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  CalendarAudience,
  CalendarCustomEventType,
  CalendarEvent,
  CalendarEventFormValues,
  CalendarSummary,
  CalendarUserRole,
} from "../types/calendar";

const assignmentsCollection = collection(db, "assignments");
const lessonsCollection = collection(db, "lessons");
const calendarEventsCollection = collection(db, "calendarEvents");

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

const dateFromMillis = (millis: number) => {
  if (!millis) return "";
  return new Date(millis).toISOString().slice(0, 10);
};

const normalizeCustomType = (value: unknown): CalendarCustomEventType => {
  if (value === "exam" || value === "event" || value === "deadline" || value === "schedule") return value;
  return "event";
};

const normalizeAudience = (value: unknown): CalendarAudience => {
  if (value === "all" || value === "teachers" || value === "students" || value === "personal") return value;
  return "personal";
};

const sortCalendarEvents = (events: CalendarEvent[]) =>
  events.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));

const mapAssignmentEvent = (id: string, data: DocumentData): CalendarEvent | null => {
  const dueDate = typeof data.dueDate === "string" ? data.dueDate : "";
  if (!dueDate) return null;

  return {
    id: `assignment-${id}`,
    sourceId: id,
    source: "assignment",
    type: "assignment",
    title: typeof data.title === "string" ? data.title : "Assignment due",
    description: typeof data.instructions === "string" ? data.instructions : "",
    date: dueDate,
    startTime: "16:00",
    endTime: "17:00",
    audience: "students",
    ownerId: typeof data.teacherId === "string" ? data.teacherId : typeof data.createdBy === "string" ? data.createdBy : "",
    ownerEmail: typeof data.teacherEmail === "string" ? data.teacherEmail : "Educor teacher",
    readOnly: true,
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  };
};

const mapLessonEvent = (id: string, data: DocumentData, role: CalendarUserRole): CalendarEvent | null => {
  const status = data.status === "draft" || data.status === "published" ? data.status : "published";
  if (role === "student" && status !== "published") return null;

  const eventDate = dateFromMillis(toMillis(data.publishedAt) || toMillis(data.updatedAt) || toMillis(data.createdAt));
  if (!eventDate) return null;

  return {
    id: `lesson-${id}`,
    sourceId: id,
    source: "lesson",
    type: "lesson",
    title: typeof data.title === "string" ? data.title : "Lesson",
    description: typeof data.summary === "string" ? data.summary : "",
    date: eventDate,
    startTime: "09:00",
    endTime: "10:00",
    audience: "students",
    ownerId: typeof data.teacherId === "string" ? data.teacherId : typeof data.createdBy === "string" ? data.createdBy : "",
    ownerEmail: typeof data.teacherEmail === "string" ? data.teacherEmail : "Educor teacher",
    readOnly: true,
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  };
};

const mapCustomEvent = (id: string, data: DocumentData): CalendarEvent | null => {
  const date = typeof data.date === "string" ? data.date : "";
  if (!date) return null;

  const type = normalizeCustomType(data.type);

  return {
    id,
    sourceId: id,
    source: "calendarEvent",
    type,
    title: typeof data.title === "string" ? data.title : "Calendar event",
    description: typeof data.description === "string" ? data.description : "",
    date,
    startTime: typeof data.startTime === "string" ? data.startTime : "09:00",
    endTime: typeof data.endTime === "string" ? data.endTime : "10:00",
    audience: normalizeAudience(data.audience),
    ownerId: typeof data.ownerId === "string" ? data.ownerId : "",
    ownerEmail: typeof data.ownerEmail === "string" ? data.ownerEmail : "Educor user",
    readOnly: false,
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  };
};

const canViewCustomEvent = (event: CalendarEvent, userId: string, role: CalendarUserRole) => {
  if (event.audience === "all") return true;
  if (event.audience === "teachers") return role === "teacher";
  if (event.audience === "students") return role === "student";
  return event.ownerId === userId;
};

export const subscribeCalendarEvents = (
  userId: string,
  role: CalendarUserRole,
  onData: (events: CalendarEvent[]) => void,
  onError: () => void
): Unsubscribe => {
  let assignmentEvents: CalendarEvent[] = [];
  let lessonEvents: CalendarEvent[] = [];
  let customEvents: CalendarEvent[] = [];

  const emit = () => onData(sortCalendarEvents([...assignmentEvents, ...lessonEvents, ...customEvents]));

  const assignmentUnsubscribe = onSnapshot(
    assignmentsCollection,
    (snapshot) => {
      assignmentEvents = snapshot.docs
        .map((assignmentDoc) => mapAssignmentEvent(assignmentDoc.id, assignmentDoc.data()))
        .filter((event): event is CalendarEvent => Boolean(event));
      emit();
    },
    onError
  );

  const lessonUnsubscribe = onSnapshot(
    lessonsCollection,
    (snapshot) => {
      lessonEvents = snapshot.docs
        .map((lessonDoc) => mapLessonEvent(lessonDoc.id, lessonDoc.data(), role))
        .filter((event): event is CalendarEvent => Boolean(event));
      emit();
    },
    onError
  );

  const customUnsubscribe = onSnapshot(
    calendarEventsCollection,
    (snapshot) => {
      customEvents = snapshot.docs
        .map((eventDoc) => mapCustomEvent(eventDoc.id, eventDoc.data()))
        .filter((event): event is CalendarEvent => Boolean(event))
        .filter((event) => canViewCustomEvent(event, userId, role));
      emit();
    },
    onError
  );

  return () => {
    assignmentUnsubscribe();
    lessonUnsubscribe();
    customUnsubscribe();
  };
};

export const createCalendarEvent = async (
  values: CalendarEventFormValues,
  owner: { uid: string; email: string },
  role: CalendarUserRole
) => {
  await addDoc(calendarEventsCollection, {
    ...values,
    title: values.title.trim(),
    description: values.description.trim(),
    audience: role === "student" ? "personal" : values.audience,
    ownerId: owner.uid,
    ownerEmail: owner.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateCalendarEvent = async (
  event: CalendarEvent,
  values: CalendarEventFormValues,
  role: CalendarUserRole
) => {
  await updateDoc(doc(db, "calendarEvents", event.id), {
    ...values,
    title: values.title.trim(),
    description: values.description.trim(),
    audience: role === "student" ? "personal" : values.audience,
    updatedAt: serverTimestamp(),
  });
};

export const deleteCalendarEvent = async (event: CalendarEvent) => {
  await deleteDoc(doc(db, "calendarEvents", event.id));
};

export const summarizeCalendarEvents = (events: CalendarEvent[]): CalendarSummary => ({
  assignments: events.filter((event) => event.type === "assignment").length,
  lessons: events.filter((event) => event.type === "lesson").length,
  exams: events.filter((event) => event.type === "exam").length,
  deadlines: events.filter((event) => event.type === "deadline").length,
  events: events.filter((event) => event.type === "event").length,
  schedule: events.filter((event) => event.type === "schedule").length,
});
