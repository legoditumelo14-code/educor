import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  NotificationCentreData,
  NotificationItem,
  NotificationSettings,
  NotificationType,
} from "../types/notification";

const announcementsCollection = collection(db, "announcements");
const assignmentsCollection = collection(db, "assignments");
const quizzesCollection = collection(db, "quizzes");
const coursesCollection = collection(db, "courses");
const notificationReadsCollection = collection(db, "notificationReads");

export const defaultNotificationSettings: NotificationSettings = {
  announcements: true,
  assignmentReminders: true,
  quizReminders: true,
  courseUpdates: true,
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

const dateToMillis = (date: string, time = "09:00") => {
  if (!date) return 0;
  const value = new Date(`${date}T${time}:00`).getTime();
  return Number.isFinite(value) ? value : 0;
};

const formatDate = (date: string) => {
  if (!date) return "No date set";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const normalizeSettings = (data: DocumentData | undefined): NotificationSettings => ({
  announcements:
    typeof data?.announcements === "boolean" ? data.announcements : defaultNotificationSettings.announcements,
  assignmentReminders:
    typeof data?.assignmentReminders === "boolean"
      ? data.assignmentReminders
      : defaultNotificationSettings.assignmentReminders,
  quizReminders:
    typeof data?.quizReminders === "boolean" ? data.quizReminders : defaultNotificationSettings.quizReminders,
  courseUpdates:
    typeof data?.courseUpdates === "boolean" ? data.courseUpdates : defaultNotificationSettings.courseUpdates,
});

const settingEnabled = (type: NotificationType, settings: NotificationSettings) => {
  if (type === "announcement") return settings.announcements;
  if (type === "assignment_reminder") return settings.assignmentReminders;
  if (type === "quiz_reminder") return settings.quizReminders;
  return settings.courseUpdates;
};

const mapAnnouncement = (id: string, data: DocumentData): NotificationItem => ({
  id: `announcement-${id}`,
  sourceId: id,
  type: "announcement",
  title: typeof data.title === "string" ? data.title : "Announcement",
  message: typeof data.message === "string" ? data.message : typeof data.body === "string" ? data.body : "",
  detail: "Announcement",
  createdAtMs: toMillis(data.createdAt) || toMillis(data.updatedAt) || Date.now(),
  read: false,
});

const mapAssignmentReminder = (id: string, data: DocumentData): NotificationItem | null => {
  const dueDate = typeof data.dueDate === "string" ? data.dueDate : "";
  const dueAtMs = dateToMillis(dueDate, "23:59");
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

  if (!dueAtMs || dueAtMs < Date.now() - 24 * 60 * 60 * 1000 || dueAtMs > Date.now() + fourteenDaysMs) {
    return null;
  }

  const title = typeof data.title === "string" ? data.title : "Assignment";

  return {
    id: `assignment-reminder-${id}`,
    sourceId: id,
    type: "assignment_reminder",
    title: "Assignment reminder",
    message: `${title} is due ${formatDate(dueDate)}.`,
    detail: "Assignment",
    createdAtMs: dueAtMs,
    read: false,
  };
};

const mapQuizReminder = (id: string, data: DocumentData): NotificationItem => {
  const updatedAtMs = toMillis(data.updatedAt) || toMillis(data.createdAt) || Date.now();

  return {
    id: `quiz-reminder-${id}`,
    sourceId: id,
    type: "quiz_reminder",
    title: "Quiz reminder",
    message: typeof data.title === "string" ? `${data.title} is ready to take.` : "A quiz is ready to take.",
    detail: "Quiz",
    createdAtMs: updatedAtMs,
    read: false,
  };
};

const mapCourseUpdate = (id: string, data: DocumentData): NotificationItem => {
  const updatedAtMs = toMillis(data.updatedAt) || toMillis(data.createdAt) || Date.now();

  return {
    id: `course-update-${id}`,
    sourceId: id,
    type: "course_update",
    title: "Course update",
    message: typeof data.title === "string" ? `${data.title} has new activity.` : "A course has new activity.",
    detail: typeof data.category === "string" ? data.category : "Course",
    createdAtMs: updatedAtMs,
    read: false,
  };
};

const mergeNotifications = (
  notifications: NotificationItem[],
  readIds: Set<string>,
  settings: NotificationSettings
): NotificationCentreData => {
  const visible = notifications
    .filter((notification) => settingEnabled(notification.type, settings))
    .map((notification) => ({ ...notification, read: readIds.has(notification.id) }))
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, 30);

  return {
    notifications: visible,
    settings,
    unreadCount: visible.filter((notification) => !notification.read).length,
  };
};

export const subscribeNotificationCentre = (
  userId: string,
  onData: (data: NotificationCentreData) => void,
  onError: () => void
): Unsubscribe => {
  let announcements: NotificationItem[] = [];
  let assignmentReminders: NotificationItem[] = [];
  let quizReminders: NotificationItem[] = [];
  let courseUpdates: NotificationItem[] = [];
  let readIds = new Set<string>();
  let settings = defaultNotificationSettings;

  const emit = () =>
    onData(mergeNotifications([...announcements, ...assignmentReminders, ...quizReminders, ...courseUpdates], readIds, settings));

  const announcementUnsubscribe = onSnapshot(
    announcementsCollection,
    (snapshot) => {
      announcements = snapshot.docs.map((announcementDoc) => mapAnnouncement(announcementDoc.id, announcementDoc.data()));
      emit();
    },
    onError
  );

  const assignmentUnsubscribe = onSnapshot(
    assignmentsCollection,
    (snapshot) => {
      assignmentReminders = snapshot.docs
        .map((assignmentDoc) => mapAssignmentReminder(assignmentDoc.id, assignmentDoc.data()))
        .filter((notification): notification is NotificationItem => Boolean(notification));
      emit();
    },
    onError
  );

  const quizUnsubscribe = onSnapshot(
    quizzesCollection,
    (snapshot) => {
      quizReminders = snapshot.docs.map((quizDoc) => mapQuizReminder(quizDoc.id, quizDoc.data()));
      emit();
    },
    onError
  );

  const courseUnsubscribe = onSnapshot(
    coursesCollection,
    (snapshot) => {
      courseUpdates = snapshot.docs.map((courseDoc) => mapCourseUpdate(courseDoc.id, courseDoc.data()));
      emit();
    },
    onError
  );

  const readsUnsubscribe = onSnapshot(
    query(notificationReadsCollection, where("userId", "==", userId)),
    (snapshot) => {
      readIds = new Set(
        snapshot.docs
          .map((readDoc) => readDoc.data())
          .map((data) => (typeof data.notificationId === "string" ? data.notificationId : ""))
          .filter(Boolean)
      );
      emit();
    },
    onError
  );

  const settingsUnsubscribe = onSnapshot(
    doc(db, "notificationSettings", userId),
    (snapshot) => {
      settings = normalizeSettings(snapshot.exists() ? snapshot.data() : undefined);
      emit();
    },
    onError
  );

  return () => {
    announcementUnsubscribe();
    assignmentUnsubscribe();
    quizUnsubscribe();
    courseUnsubscribe();
    readsUnsubscribe();
    settingsUnsubscribe();
  };
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
  await setDoc(doc(db, "notificationReads", `${userId}_${notificationId}`), {
    userId,
    notificationId,
    readAt: serverTimestamp(),
  });
};

export const markNotificationsAsRead = async (userId: string, notificationIds: string[]) => {
  await Promise.all(notificationIds.map((notificationId) => markNotificationAsRead(userId, notificationId)));
};

export const saveNotificationSettings = async (userId: string, settings: NotificationSettings) => {
  await setDoc(
    doc(db, "notificationSettings", userId),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};
