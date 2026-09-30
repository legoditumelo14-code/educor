import {
  collection,
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
import { getAssignments, getSubmissionsForStudent } from "./assignments";
import { db } from "./firebase";
import { getProgressDashboard } from "./progress";
import type { MessageConversation, MessageParticipant, TypingParticipant } from "../types/messaging";
import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  ParentLearner,
  ParentNotification,
  ParentNotificationType,
  ParentPortalData,
} from "../types/parentPortal";

const parentLearnersCollection = collection(db, "parentLearners");
const attendanceCollection = collection(db, "attendanceRecords");
const parentNotificationsCollection = collection(db, "parentNotifications");
const conversationsCollection = collection(db, "messageConversations");

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

const emailKey = (email: string) => `email:${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

const normalizeAttendanceStatus = (value: unknown): AttendanceStatus => {
  if (value === "absent" || value === "late" || value === "excused") return value;
  return "present";
};

const normalizeNotificationType = (value: unknown): ParentNotificationType => {
  if (value === "attendance" || value === "assignment" || value === "message") return value;
  return "progress";
};

const normalizeParticipants = (participants: unknown): MessageParticipant[] => {
  if (!Array.isArray(participants)) return [];

  return participants
    .map((participant): MessageParticipant | null => {
      if (!participant || typeof participant !== "object") return null;
      const data = participant as Partial<MessageParticipant>;
      if (!data.id || !data.email) return null;

      return {
        id: data.id,
        email: data.email,
        role:
          data.role === "teacher" || data.role === "parent" || data.role === "admin" || data.role === "student"
            ? data.role
            : "parent",
      };
    })
    .filter((participant): participant is MessageParticipant => Boolean(participant));
};

const normalizeTyping = (typingBy: unknown): TypingParticipant[] => {
  if (!typingBy || typeof typingBy !== "object") return [];

  return Object.entries(typingBy as Record<string, unknown>)
    .map(([userId, value]): TypingParticipant | null => {
      if (!value || typeof value !== "object") return null;
      const data = value as { email?: unknown; expiresAtMs?: unknown };
      const expiresAtMs = typeof data.expiresAtMs === "number" ? data.expiresAtMs : 0;
      if (expiresAtMs < Date.now()) return null;

      return {
        userId,
        email: typeof data.email === "string" ? data.email : "Someone",
        expiresAtMs,
      };
    })
    .filter((participant): participant is TypingParticipant => Boolean(participant));
};

const mapLearner = (id: string, data: DocumentData): ParentLearner => ({
  id,
  parentId: typeof data.parentId === "string" ? data.parentId : "",
  studentId: typeof data.studentId === "string" ? data.studentId : "",
  studentEmail: typeof data.studentEmail === "string" ? data.studentEmail : "learner@example.com",
  displayName: typeof data.displayName === "string" ? data.displayName : typeof data.studentEmail === "string" ? data.studentEmail : "Learner",
  gradeLevel: typeof data.gradeLevel === "string" ? data.gradeLevel : "Unassigned",
});

const mapAttendance = (id: string, data: DocumentData): AttendanceRecord => ({
  id,
  studentId: typeof data.studentId === "string" ? data.studentId : "",
  date: typeof data.date === "string" ? data.date : "",
  status: normalizeAttendanceStatus(data.status),
  note: typeof data.note === "string" ? data.note : "",
  recordedBy: typeof data.recordedBy === "string" ? data.recordedBy : "",
  createdAtMs: toMillis(data.createdAt),
});

const mapNotification = (id: string, data: DocumentData): ParentNotification => ({
  id,
  parentId: typeof data.parentId === "string" ? data.parentId : "",
  studentId: typeof data.studentId === "string" ? data.studentId : "",
  type: normalizeNotificationType(data.type),
  title: typeof data.title === "string" ? data.title : "Parent update",
  message: typeof data.message === "string" ? data.message : "",
  createdAtMs: toMillis(data.createdAt) || toMillis(data.updatedAt),
  read: Boolean(data.read),
});

const mapConversation = (id: string, data: DocumentData, parentKey: string): MessageConversation => {
  const participantKeys = Array.isArray(data.participantKeys)
    ? data.participantKeys.filter((value): value is string => typeof value === "string")
    : [];
  const unreadBy = data.unreadBy && typeof data.unreadBy === "object" ? (data.unreadBy as Record<string, unknown>) : {};

  return {
    id,
    type: data.type === "teacher_parent" || data.type === "admin_teacher" || data.type === "teacher_student" ? data.type : "teacher_parent",
    title: typeof data.title === "string" ? data.title : "Teacher conversation",
    participantKeys,
    participantIds: participantKeys,
    participants: normalizeParticipants(data.participants),
    lastMessage: typeof data.lastMessage === "string" ? data.lastMessage : "",
    lastMessageAtMs: toMillis(data.lastMessageAt) || toMillis(data.updatedAt),
    unread: Boolean(unreadBy[parentKey]),
    typingParticipants: normalizeTyping(data.typingBy),
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  };
};

const summarizeAttendance = (records: AttendanceRecord[]): AttendanceSummary => {
  const total = records.length;
  const present = records.filter((record) => record.status === "present").length;
  const absent = records.filter((record) => record.status === "absent").length;
  const late = records.filter((record) => record.status === "late").length;
  const excused = records.filter((record) => record.status === "excused").length;

  return {
    total,
    present,
    absent,
    late,
    excused,
    attendancePercent: total ? Math.round(((present + late + excused) / total) * 100) : 0,
  };
};

export const getParentLearners = async (parentId: string): Promise<ParentLearner[]> => {
  const snapshot = await getDocs(query(parentLearnersCollection, where("parentId", "==", parentId)));
  return snapshot.docs.map((learnerDoc) => mapLearner(learnerDoc.id, learnerDoc.data()));
};

export const getParentPortalData = async (
  parentId: string,
  parentEmail: string,
  selectedLearnerId?: string
): Promise<ParentPortalData> => {
  const learners = await getParentLearners(parentId);
  const selectedLearner = learners.find((learner) => learner.studentId === selectedLearnerId) ?? learners[0] ?? null;
  const parentEmailKey = emailKey(parentEmail);

  const [notificationsSnapshot, conversationsSnapshot] = await Promise.all([
    getDocs(query(parentNotificationsCollection, where("parentId", "==", parentId))),
    getDocs(query(conversationsCollection, where("participantKeys", "array-contains", parentEmailKey))),
  ]);

  const notifications = notificationsSnapshot.docs
    .map((notificationDoc) => mapNotification(notificationDoc.id, notificationDoc.data()))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
  const teacherThreads = conversationsSnapshot.docs
    .map((conversationDoc) => mapConversation(conversationDoc.id, conversationDoc.data(), parentEmailKey))
    .sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs);

  if (!selectedLearner) {
    return {
      learners,
      selectedLearner: null,
      progress: null,
      assignments: [],
      submissions: [],
      attendance: [],
      attendanceSummary: summarizeAttendance([]),
      notifications,
      teacherThreads,
    };
  }

  const [progress, assignments, submissionsMap, attendanceSnapshot] = await Promise.all([
    getProgressDashboard("student", selectedLearner.studentId),
    getAssignments(),
    getSubmissionsForStudent(selectedLearner.studentId),
    getDocs(query(attendanceCollection, where("studentId", "==", selectedLearner.studentId))),
  ]);
  const attendance = attendanceSnapshot.docs
    .map((attendanceDoc) => mapAttendance(attendanceDoc.id, attendanceDoc.data()))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    learners,
    selectedLearner,
    progress,
    assignments,
    submissions: Object.values(submissionsMap),
    attendance,
    attendanceSummary: summarizeAttendance(attendance),
    notifications: notifications.filter(
      (notification) => !notification.studentId || notification.studentId === selectedLearner.studentId
    ),
    teacherThreads,
  };
};

export const linkParentLearner = async (
  parentId: string,
  studentEmail: string,
  displayName: string,
  gradeLevel: string
) => {
  const normalizedEmail = studentEmail.trim().toLowerCase();
  const linkId = `${parentId}_${emailKey(normalizedEmail)}`;

  await setDoc(
    doc(db, "parentLearners", linkId),
    {
      parentId,
      studentId: emailKey(normalizedEmail),
      studentEmail: normalizedEmail,
      displayName: displayName.trim() || normalizedEmail,
      gradeLevel: gradeLevel.trim() || "Unassigned",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const markParentNotificationRead = async (notification: ParentNotification) => {
  await updateDoc(doc(db, "parentNotifications", notification.id), {
    read: true,
    updatedAt: serverTimestamp(),
  });
};
