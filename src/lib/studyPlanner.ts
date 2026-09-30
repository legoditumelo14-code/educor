import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  StudyPlannerSummary,
  StudyPlannerType,
  StudyTask,
  StudyTaskFormValues,
  StudyTaskPriority,
} from "../types/studyPlanner";

const studyTasksCollection = collection(db, "studyPlannerTasks");

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

const normalizePlannerType = (value: unknown): StudyPlannerType => {
  if (value === "daily" || value === "weekly" || value === "revision") return value;
  return "daily";
};

const normalizePriority = (value: unknown): StudyTaskPriority => {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
};

const mapStudyTask = (id: string, data: DocumentData): StudyTask => ({
  id,
  userId: typeof data.userId === "string" ? data.userId : "",
  title: typeof data.title === "string" ? data.title : "Untitled study task",
  description: typeof data.description === "string" ? data.description : "",
  subject: typeof data.subject === "string" ? data.subject : "General",
  plannerType: normalizePlannerType(data.plannerType),
  date: typeof data.date === "string" ? data.date : "",
  startTime: typeof data.startTime === "string" ? data.startTime : "",
  endTime: typeof data.endTime === "string" ? data.endTime : "",
  priority: normalizePriority(data.priority),
  completed: Boolean(data.completed),
  reminderEnabled: Boolean(data.reminderEnabled),
  reminderMinutesBefore: typeof data.reminderMinutesBefore === "number" ? data.reminderMinutesBefore : 30,
  createdAtMs: toMillis(data.createdAt),
  updatedAtMs: toMillis(data.updatedAt),
});

export const getStudyTasks = async (userId: string): Promise<StudyTask[]> => {
  const tasksQuery = query(studyTasksCollection, where("userId", "==", userId));
  const snapshot = await getDocs(tasksQuery);

  return snapshot.docs
    .map((taskDoc) => mapStudyTask(taskDoc.id, taskDoc.data()))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
};

export const createStudyTask = async (userId: string, values: StudyTaskFormValues) => {
  await addDoc(studyTasksCollection, {
    userId,
    ...values,
    title: values.title.trim(),
    description: values.description.trim(),
    subject: values.subject.trim() || "General",
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateStudyTask = async (task: StudyTask, values: StudyTaskFormValues) => {
  await updateDoc(doc(db, "studyPlannerTasks", task.id), {
    ...values,
    title: values.title.trim(),
    description: values.description.trim(),
    subject: values.subject.trim() || "General",
    updatedAt: serverTimestamp(),
  });
};

export const toggleStudyTask = async (task: StudyTask) => {
  await updateDoc(doc(db, "studyPlannerTasks", task.id), {
    completed: !task.completed,
    updatedAt: serverTimestamp(),
  });
};

export const deleteStudyTask = async (task: StudyTask) => {
  await deleteDoc(doc(db, "studyPlannerTasks", task.id));
};

export const summarizeStudyTasks = (tasks: StudyTask[]): StudyPlannerSummary => ({
  total: tasks.length,
  completed: tasks.filter((task) => task.completed).length,
  pending: tasks.filter((task) => !task.completed).length,
  highPriority: tasks.filter((task) => task.priority === "high" && !task.completed).length,
  reminderCount: tasks.filter((task) => task.reminderEnabled).length,
});

const calendarDate = (date: string, time: string) =>
  `${date.replace(/-/g, "")}T${(time || "09:00").replace(":", "")}00`;

const safeCalendarText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");

export const createStudyTaskIcs = (task: StudyTask) => [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Educor//Study Planner//EN",
  "BEGIN:VEVENT",
  `UID:${task.id}@educor`,
  `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
  `DTSTART:${calendarDate(task.date, task.startTime)}`,
  `DTEND:${calendarDate(task.date, task.endTime || task.startTime)}`,
  `SUMMARY:${safeCalendarText(task.title)}`,
  `DESCRIPTION:${safeCalendarText(`${task.subject} - ${task.description}`)}`,
  task.reminderEnabled ? "BEGIN:VALARM" : "",
  task.reminderEnabled ? `TRIGGER:-PT${task.reminderMinutesBefore}M` : "",
  task.reminderEnabled ? "ACTION:DISPLAY" : "",
  task.reminderEnabled ? `DESCRIPTION:${safeCalendarText(task.title)}` : "",
  task.reminderEnabled ? "END:VALARM" : "",
  "END:VEVENT",
  "END:VCALENDAR",
]
  .filter(Boolean)
  .join("\n");

export const downloadStudyTaskCalendar = (task: StudyTask) => {
  const blob = new Blob([createStudyTaskIcs(task)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "study-task"}.ics`;
  link.click();
  URL.revokeObjectURL(url);
};

export const googleCalendarUrl = (task: StudyTask) => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: task.title,
    details: `${task.subject}\n${task.description}`,
    dates: `${calendarDate(task.date, task.startTime)}/${calendarDate(task.date, task.endTime || task.startTime)}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
