import {
  addDoc,
  collection,
  deleteDoc,
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
import type { ForumAuthor, ForumPost, ForumPostFormValues, ForumPostType, ForumReply } from "../types/forum";

const postsCollection = collection(db, "forumPosts");
const repliesCollection = collection(db, "forumReplies");

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

const normalizePostType = (value: unknown): ForumPostType => {
  if (value === "discussion" || value === "question") return value;
  return "discussion";
};

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const mapPost = (id: string, data: DocumentData): ForumPost => ({
  id,
  courseId: typeof data.courseId === "string" ? data.courseId : "",
  courseTitle: typeof data.courseTitle === "string" ? data.courseTitle : "General discussion",
  type: normalizePostType(data.type),
  title: typeof data.title === "string" ? data.title : "Untitled post",
  body: typeof data.body === "string" ? data.body : "",
  authorId: typeof data.authorId === "string" ? data.authorId : "",
  authorEmail: typeof data.authorEmail === "string" ? data.authorEmail : "Educor user",
  authorRole: data.authorRole === "teacher" ? "teacher" : "student",
  pinned: Boolean(data.pinned),
  locked: Boolean(data.locked),
  likeUserIds: normalizeStringArray(data.likeUserIds),
  replyCount: typeof data.replyCount === "number" ? data.replyCount : 0,
  createdAtMs: toMillis(data.createdAt),
  updatedAtMs: toMillis(data.updatedAt),
});

const mapReply = (id: string, data: DocumentData): ForumReply => ({
  id,
  postId: typeof data.postId === "string" ? data.postId : "",
  body: typeof data.body === "string" ? data.body : "",
  authorId: typeof data.authorId === "string" ? data.authorId : "",
  authorEmail: typeof data.authorEmail === "string" ? data.authorEmail : "Educor user",
  authorRole: data.authorRole === "teacher" ? "teacher" : "student",
  likeUserIds: normalizeStringArray(data.likeUserIds),
  createdAtMs: toMillis(data.createdAt),
  updatedAtMs: toMillis(data.updatedAt),
});

const sortPosts = (posts: ForumPost[]) =>
  posts.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAtMs - a.updatedAtMs;
  });

export const subscribeForumPosts = (
  onData: (posts: ForumPost[]) => void,
  onError: () => void
): Unsubscribe =>
  onSnapshot(
    postsCollection,
    (snapshot) => {
      onData(sortPosts(snapshot.docs.map((postDoc) => mapPost(postDoc.id, postDoc.data()))));
    },
    onError
  );

export const subscribeForumReplies = (
  postId: string,
  onData: (replies: ForumReply[]) => void,
  onError: () => void
): Unsubscribe =>
  onSnapshot(
    query(repliesCollection, where("postId", "==", postId)),
    (snapshot) => {
      onData(
        snapshot.docs
          .map((replyDoc) => mapReply(replyDoc.id, replyDoc.data()))
          .sort((a, b) => a.createdAtMs - b.createdAtMs)
      );
    },
    onError
  );

export const createForumPost = async (values: ForumPostFormValues, author: ForumAuthor) => {
  await addDoc(postsCollection, {
    courseId: values.courseId,
    courseTitle: values.courseTitle,
    type: values.type,
    title: values.title.trim(),
    body: values.body.trim(),
    authorId: author.uid,
    authorEmail: author.email,
    authorRole: author.role,
    pinned: false,
    locked: false,
    likeUserIds: [],
    replyCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const createForumReply = async (post: ForumPost, body: string, author: ForumAuthor) => {
  await addDoc(repliesCollection, {
    postId: post.id,
    body: body.trim(),
    authorId: author.uid,
    authorEmail: author.email,
    authorRole: author.role,
    likeUserIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "forumPosts", post.id), {
    replyCount: post.replyCount + 1,
    updatedAt: serverTimestamp(),
  });
};

export const toggleForumPostLike = async (post: ForumPost, userId: string) => {
  const likeUserIds = post.likeUserIds.includes(userId)
    ? post.likeUserIds.filter((id) => id !== userId)
    : [...post.likeUserIds, userId];

  await updateDoc(doc(db, "forumPosts", post.id), {
    likeUserIds,
    updatedAt: serverTimestamp(),
  });
};

export const toggleForumReplyLike = async (reply: ForumReply, userId: string) => {
  const likeUserIds = reply.likeUserIds.includes(userId)
    ? reply.likeUserIds.filter((id) => id !== userId)
    : [...reply.likeUserIds, userId];

  await updateDoc(doc(db, "forumReplies", reply.id), {
    likeUserIds,
    updatedAt: serverTimestamp(),
  });
};

export const toggleForumPostPinned = async (post: ForumPost) => {
  await updateDoc(doc(db, "forumPosts", post.id), {
    pinned: !post.pinned,
    updatedAt: serverTimestamp(),
  });
};

export const toggleForumPostLocked = async (post: ForumPost) => {
  await updateDoc(doc(db, "forumPosts", post.id), {
    locked: !post.locked,
    updatedAt: serverTimestamp(),
  });
};

export const deleteForumPost = async (post: ForumPost) => {
  const replies = await getDocs(query(repliesCollection, where("postId", "==", post.id)));

  await Promise.all(replies.docs.map((replyDoc) => deleteDoc(doc(db, "forumReplies", replyDoc.id))));
  await deleteDoc(doc(db, "forumPosts", post.id));
};

export const deleteForumReply = async (post: ForumPost, reply: ForumReply) => {
  await deleteDoc(doc(db, "forumReplies", reply.id));
  await updateDoc(doc(db, "forumPosts", post.id), {
    replyCount: Math.max(post.replyCount - 1, 0),
    updatedAt: serverTimestamp(),
  });
};
