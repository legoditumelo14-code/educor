export const FORUM_POST_TYPES = ["discussion", "question"] as const;

export type ForumPostType = (typeof FORUM_POST_TYPES)[number];

export interface ForumAuthor {
  uid: string;
  email: string;
  role: "student" | "teacher";
}

export interface ForumPost {
  id: string;
  courseId: string;
  courseTitle: string;
  type: ForumPostType;
  title: string;
  body: string;
  authorId: string;
  authorEmail: string;
  authorRole: ForumAuthor["role"];
  pinned: boolean;
  locked: boolean;
  likeUserIds: string[];
  replyCount: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface ForumReply {
  id: string;
  postId: string;
  body: string;
  authorId: string;
  authorEmail: string;
  authorRole: ForumAuthor["role"];
  likeUserIds: string[];
  createdAtMs: number;
  updatedAtMs: number;
}

export interface ForumPostFormValues {
  courseId: string;
  courseTitle: string;
  type: ForumPostType;
  title: string;
  body: string;
}
