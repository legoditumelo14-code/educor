import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  ChatMessage,
  ConversationDraft,
  MessageAuthor,
  MessageConversation,
  MessageConversationType,
  MessageParticipant,
  MessageParticipantRole,
  TypingParticipant,
} from "../types/messaging";

const conversationsCollection = collection(db, "messageConversations");
const messagesCollection = collection(db, "messages");

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
const uidKey = (uid: string) => `uid:${uid}`;

const currentKeys = (author: Pick<MessageAuthor, "uid" | "email">) => [uidKey(author.uid), emailKey(author.email)];

const normalizeRole = (value: unknown): MessageParticipantRole => {
  if (value === "student" || value === "teacher" || value === "parent" || value === "admin") return value;
  return "student";
};

const normalizeConversationType = (value: unknown): MessageConversationType => {
  if (value === "teacher_student" || value === "teacher_parent" || value === "admin_teacher") return value;
  return "teacher_student";
};

const conversationTypeFor = (authorRole: MessageAuthor["role"], targetRole: ConversationDraft["targetRole"]) => {
  if (authorRole === "teacher" && targetRole === "parent") return "teacher_parent";
  if ((authorRole === "teacher" && targetRole === "admin") || (authorRole === "student" && targetRole === "teacher")) {
    return targetRole === "admin" ? "admin_teacher" : "teacher_student";
  }
  return "teacher_student";
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
        role: normalizeRole(data.role),
      };
    })
    .filter((participant): participant is MessageParticipant => Boolean(participant));
};

const normalizeTyping = (typingBy: unknown, activeKeys: Set<string>): TypingParticipant[] => {
  if (!typingBy || typeof typingBy !== "object") return [];

  return Object.entries(typingBy as Record<string, unknown>)
    .map(([userId, value]): TypingParticipant | null => {
      if (!value || typeof value !== "object" || activeKeys.has(userId)) return null;
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

const normalizeReadBy = (readBy: unknown) =>
  Array.isArray(readBy) ? readBy.filter((value): value is string => typeof value === "string") : [];

const mapConversation = (id: string, data: DocumentData, activeKeys: Set<string>): MessageConversation => {
  const participantKeys = Array.isArray(data.participantKeys)
    ? data.participantKeys.filter((value): value is string => typeof value === "string")
    : [];
  const unreadBy = data.unreadBy && typeof data.unreadBy === "object" ? (data.unreadBy as Record<string, unknown>) : {};

  return {
    id,
    type: normalizeConversationType(data.type),
    title: typeof data.title === "string" ? data.title : "Conversation",
    participantKeys,
    participantIds: participantKeys,
    participants: normalizeParticipants(data.participants),
    lastMessage: typeof data.lastMessage === "string" ? data.lastMessage : "",
    lastMessageAtMs: toMillis(data.lastMessageAt) || toMillis(data.updatedAt),
    unread: [...activeKeys].some((key) => Boolean(unreadBy[key])),
    typingParticipants: normalizeTyping(data.typingBy, activeKeys),
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  };
};

const mapMessage = (id: string, data: DocumentData): ChatMessage => ({
  id,
  conversationId: typeof data.conversationId === "string" ? data.conversationId : "",
  senderId: typeof data.senderId === "string" ? data.senderId : "",
  senderEmail: typeof data.senderEmail === "string" ? data.senderEmail : "Educor user",
  body: typeof data.body === "string" ? data.body : "",
  readBy: normalizeReadBy(data.readBy),
  createdAtMs: toMillis(data.createdAt),
});

const mergeConversationLists = (
  lists: MessageConversation[][],
  onData: (conversations: MessageConversation[]) => void
) => {
  const byId = new Map<string, MessageConversation>();
  lists.flat().forEach((conversation) => byId.set(conversation.id, conversation));
  onData([...byId.values()].sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs));
};

export const subscribeConversations = (
  author: MessageAuthor,
  onData: (conversations: MessageConversation[]) => void,
  onError: () => void
): Unsubscribe => {
  const keys = currentKeys(author);
  const activeKeys = new Set(keys);
  const lists: MessageConversation[][] = [[], []];

  const unsubscribes = keys.map((key, index) =>
    onSnapshot(
      query(conversationsCollection, where("participantKeys", "array-contains", key)),
      (snapshot) => {
        lists[index] = snapshot.docs.map((conversationDoc) =>
          mapConversation(conversationDoc.id, conversationDoc.data(), activeKeys)
        );
        mergeConversationLists(lists, onData);
      },
      onError
    )
  );

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
};

export const subscribeMessages = (
  conversationId: string,
  onData: (messages: ChatMessage[]) => void,
  onError: () => void
): Unsubscribe =>
  onSnapshot(
    query(messagesCollection, where("conversationId", "==", conversationId)),
    (snapshot) => {
      onData(
        snapshot.docs
          .map((messageDoc) => mapMessage(messageDoc.id, messageDoc.data()))
          .sort((a, b) => a.createdAtMs - b.createdAtMs)
      );
    },
    onError
  );

export const createOrFindConversation = async (author: MessageAuthor, draft: ConversationDraft) => {
  const authorKey = uidKey(author.uid);
  const authorEmailKey = emailKey(author.email);
  const targetKey = emailKey(draft.targetEmail);
  const type = conversationTypeFor(author.role, draft.targetRole);
  const snapshot = await getDocs(query(conversationsCollection, where("participantKeys", "array-contains", authorKey)));
  const existing = snapshot.docs.find((conversationDoc) => {
    const data = conversationDoc.data();
    const keys = Array.isArray(data.participantKeys) ? data.participantKeys : [];
    return data.type === type && keys.includes(targetKey);
  });

  if (existing) return existing.id;

  const title =
    draft.subject.trim() ||
    (type === "teacher_parent"
      ? "Teacher and parent conversation"
      : type === "admin_teacher"
        ? "Admin and teacher conversation"
        : "Teacher and student conversation");
  const participants: MessageParticipant[] = [
    {
      id: authorKey,
      email: author.email,
      role: author.role,
    },
    {
      id: targetKey,
      email: draft.targetEmail.trim().toLowerCase(),
      role: draft.targetRole,
    },
  ];

  const conversation = await addDoc(conversationsCollection, {
    type,
    title,
    participantKeys: [authorKey, authorEmailKey, targetKey],
    participants,
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    unreadBy: {
      [authorKey]: false,
      [authorEmailKey]: false,
      [targetKey]: false,
    },
    typingBy: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return conversation.id;
};

export const sendMessage = async (conversation: MessageConversation, author: MessageAuthor, body: string) => {
  const trimmed = body.trim();
  if (!trimmed) return;

  const authorKeys = new Set(currentKeys(author));
  const unreadBy = conversation.participantKeys.reduce<Record<string, boolean>>((map, key) => {
    map[key] = !authorKeys.has(key);
    return map;
  }, {});

  await addDoc(messagesCollection, {
    conversationId: conversation.id,
    senderId: uidKey(author.uid),
    senderEmail: author.email,
    body: trimmed,
    readBy: [...authorKeys],
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "messageConversations", conversation.id), {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
    unreadBy,
    [`typingBy.${uidKey(author.uid)}`]: {
      email: author.email,
      expiresAtMs: 0,
    },
    updatedAt: serverTimestamp(),
  });
};

export const markConversationRead = async (conversation: MessageConversation, author: MessageAuthor) => {
  const updates = currentKeys(author).reduce<Record<string, boolean | ReturnType<typeof serverTimestamp>>>(
    (map, key) => {
      map[`unreadBy.${key}`] = false;
      return map;
    },
    { updatedAt: serverTimestamp() }
  );

  await updateDoc(doc(db, "messageConversations", conversation.id), updates);
};

export const updateTypingStatus = async (
  conversation: MessageConversation,
  author: MessageAuthor,
  typing: boolean
) => {
  await updateDoc(doc(db, "messageConversations", conversation.id), {
    [`typingBy.${uidKey(author.uid)}`]: {
      email: author.email,
      expiresAtMs: typing ? Date.now() + 5000 : 0,
    },
    updatedAt: serverTimestamp(),
  });
};
