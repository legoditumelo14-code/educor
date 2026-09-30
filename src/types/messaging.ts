export const MESSAGE_PARTICIPANT_ROLES = ["student", "teacher", "parent", "admin"] as const;
export const MESSAGE_CONVERSATION_TYPES = ["teacher_student", "teacher_parent", "admin_teacher"] as const;

export type MessageParticipantRole = (typeof MESSAGE_PARTICIPANT_ROLES)[number];
export type MessageConversationType = (typeof MESSAGE_CONVERSATION_TYPES)[number];

export interface MessageParticipant {
  id: string;
  email: string;
  role: MessageParticipantRole;
}

export interface TypingParticipant {
  userId: string;
  email: string;
  expiresAtMs: number;
}

export interface MessageConversation {
  id: string;
  type: MessageConversationType;
  title: string;
  participantKeys: string[];
  participantIds: string[];
  participants: MessageParticipant[];
  lastMessage: string;
  lastMessageAtMs: number;
  unread: boolean;
  typingParticipants: TypingParticipant[];
  createdAtMs: number;
  updatedAtMs: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderEmail: string;
  body: string;
  readBy: string[];
  createdAtMs: number;
}

export interface ConversationDraft {
  targetEmail: string;
  targetRole: Exclude<MessageParticipantRole, "teacher"> | "teacher";
  subject: string;
}

export interface MessageAuthor {
  uid: string;
  email: string;
  role: "student" | "teacher";
}
