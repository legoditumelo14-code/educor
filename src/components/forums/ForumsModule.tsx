import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  HelpCircle,
  Loader2,
  Lock,
  MessageSquare,
  Pin,
  RefreshCw,
  Reply,
  Search,
  Send,
  Sparkles,
  ThumbsUp,
  Trash2,
  Unlock,
} from "lucide-react";
import clsx from "clsx";
import { auth } from "../../lib/firebase";
import { getCourses } from "../../lib/courses";
import {
  createForumPost,
  createForumReply,
  deleteForumPost,
  deleteForumReply,
  subscribeForumPosts,
  subscribeForumReplies,
  toggleForumPostLike,
  toggleForumPostLocked,
  toggleForumPostPinned,
  toggleForumReplyLike,
} from "../../lib/forums";
import type { Course } from "../../types/course";
import type { ForumAuthor, ForumPost, ForumPostFormValues, ForumPostType, ForumReply } from "../../types/forum";
import ForumPostForm from "./ForumPostForm";
import ForumState from "./ForumState";

interface ForumsModuleProps {
  role: "student" | "teacher" | null;
}

type PostFilter = "all" | ForumPostType;

const skeletonCards = Array.from({ length: 5 }, (_, index) => index);

const postFilters: Array<{ value: PostFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "discussion", label: "Discussions" },
  { value: "question", label: "Questions" },
];

const formatTime = (millis: number) => {
  if (!millis) return "Recently";
  return new Date(millis).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const authorFromAuth = (role: ForumsModuleProps["role"]): ForumAuthor | null => {
  const user = auth.currentUser;
  if (!user) return null;

  return {
    uid: user.uid,
    email: user.email || "Educor user",
    role: role === "teacher" ? "teacher" : "student",
  };
};

const matchesSearch = (post: ForumPost, search: string) => {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return [post.title, post.body, post.courseTitle, post.authorEmail, post.type]
    .join(" ")
    .toLowerCase()
    .includes(query);
};

function PostCard({
  post,
  selected,
  canModerate,
  currentUserId,
  busy,
  onSelect,
  onLike,
  onPin,
  onLock,
  onDelete,
}: {
  post: ForumPost;
  selected: boolean;
  canModerate: boolean;
  currentUserId: string;
  busy: boolean;
  onSelect: (post: ForumPost) => void;
  onLike: (post: ForumPost) => void;
  onPin: (post: ForumPost) => void;
  onLock: (post: ForumPost) => void;
  onDelete: (post: ForumPost) => void;
}) {
  const liked = post.likeUserIds.includes(currentUserId);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={clsx(
        "rounded-xl border p-5 shadow-sm backdrop-blur-xl transition",
        selected
          ? "border-[#135d54] bg-[#eef7f4]"
          : "border-white/45 bg-white/75 dark:border-white/10 dark:bg-white/10"
      )}
    >
      <button type="button" onClick={() => onSelect(post)} className="block w-full text-left">
        <div className="flex flex-wrap items-center gap-2">
          {post.pinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#135d54] px-3 py-1 text-xs font-bold text-white">
              <Pin size={12} aria-hidden="true" />
              Pinned
            </span>
          )}
          <span className="rounded-full bg-[#edf5fb] px-3 py-1 text-xs font-bold text-[#2f6f9f]">
            {post.courseTitle}
          </span>
          <span
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-bold",
              post.type === "question" ? "bg-[#fff1ec] text-[#9d321f]" : "bg-[#eef7f4] text-[#135d54]"
            )}
          >
            {post.type}
          </span>
          {post.locked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f3f2] px-3 py-1 text-xs font-bold text-[#52645f]">
              <Lock size={12} aria-hidden="true" />
              Locked
            </span>
          )}
        </div>

        <h3 className="mt-4 text-xl font-bold">{post.title}</h3>
        <p className="mt-2 line-clamp-3 leading-7 text-[#52645f] dark:text-white/65">{post.body}</p>
        <p className="mt-3 text-sm font-semibold text-[#6c7d78] dark:text-white/55">
          {post.authorEmail} - {formatTime(post.updatedAtMs || post.createdAtMs)}
        </p>
      </button>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLike(post)}
            disabled={busy || !currentUserId}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
              liked ? "bg-[#135d54] text-white" : "bg-white text-[#52645f] hover:text-[#135d54]"
            )}
          >
            <ThumbsUp size={16} aria-hidden="true" />
            {post.likeUserIds.length}
          </button>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#52645f]">
            <Reply size={16} aria-hidden="true" />
            {post.replyCount}
          </span>
        </div>

        {canModerate && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPin(post)}
              disabled={busy}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#c9ded8] bg-white/80 text-[#52645f] transition hover:border-[#135d54] hover:text-[#135d54] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={post.pinned ? "Unpin post" : "Pin post"}
              title={post.pinned ? "Unpin" : "Pin"}
            >
              <Pin size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onLock(post)}
              disabled={busy}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#c9ded8] bg-white/80 text-[#52645f] transition hover:border-[#135d54] hover:text-[#135d54] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={post.locked ? "Unlock post" : "Lock post"}
              title={post.locked ? "Unlock" : "Lock"}
            >
              {post.locked ? <Unlock size={17} aria-hidden="true" /> : <Lock size={17} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => onDelete(post)}
              disabled={busy}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#ffd8c9] bg-[#fff1ec] text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Delete post"
              title="Delete"
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
}

function ReplyCard({
  post,
  reply,
  canModerate,
  currentUserId,
  busy,
  onLike,
  onDelete,
}: {
  post: ForumPost;
  reply: ForumReply;
  canModerate: boolean;
  currentUserId: string;
  busy: boolean;
  onLike: (reply: ForumReply) => void;
  onDelete: (post: ForumPost, reply: ForumReply) => void;
}) {
  const liked = reply.likeUserIds.includes(currentUserId);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{reply.authorEmail}</p>
          <p className="mt-1 text-xs font-semibold uppercase text-[#6c7d78] dark:text-white/55">
            {reply.authorRole} - {formatTime(reply.createdAtMs)}
          </p>
        </div>
        {canModerate && (
          <button
            type="button"
            onClick={() => onDelete(post, reply)}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#ffd8c9] bg-[#fff1ec] text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Delete reply"
            title="Delete reply"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="mt-3 leading-7 text-[#52645f] dark:text-white/70">{reply.body}</p>
      <button
        type="button"
        onClick={() => onLike(reply)}
        disabled={busy || !currentUserId}
        className={clsx(
          "mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
          liked ? "bg-[#135d54] text-white" : "bg-white text-[#52645f] hover:text-[#135d54]"
        )}
      >
        <ThumbsUp size={15} aria-hidden="true" />
        {reply.likeUserIds.length}
      </button>
    </motion.article>
  );
}

export default function ForumsModule({ role }: ForumsModuleProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [courseFilter, setCourseFilter] = useState("all");
  const [postFilter, setPostFilter] = useState<PostFilter>("all");
  const [search, setSearch] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const author = useMemo(() => authorFromAuth(role), [role]);
  const canModerate = role === "teacher";
  const currentUserId = author?.uid ?? "";

  useEffect(() => {
    let mounted = true;

    const loadCourses = async () => {
      try {
        const courseData = await getCourses();
        if (mounted) setCourses(courseData);
      } catch {
        if (mounted) setActionError("Courses could not be loaded for forum filters.");
      }
    };

    loadCourses();

    const unsubscribe = subscribeForumPosts(
      (postData) => {
        if (!mounted) return;
        setPosts(postData);
        setSelectedPostId((current) => current || postData[0]?.id || "");
        setError("");
        setLoading(false);
      },
      () => {
        if (!mounted) return;
        setError("Forum posts could not be loaded. Check your connection and try again.");
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId]
  );

  useEffect(() => {
    if (!selectedPost) {
      const timer = window.setTimeout(() => {
        setReplies([]);
        setLoadingReplies(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const unsubscribe = subscribeForumReplies(
      selectedPost.id,
      (replyData) => {
        setReplies(replyData);
        setLoadingReplies(false);
      },
      () => {
        setActionError("Replies could not be loaded for this post.");
        setLoadingReplies(false);
      }
    );

    return () => unsubscribe();
  }, [selectedPost]);

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        const matchesCourse = courseFilter === "all" || post.courseId === courseFilter;
        const matchesType = postFilter === "all" || post.type === postFilter;
        return matchesCourse && matchesType && matchesSearch(post, search);
      }),
    [courseFilter, postFilter, posts, search]
  );

  const stats = useMemo(
    () => ({
      posts: posts.length,
      questions: posts.filter((post) => post.type === "question").length,
      pinned: posts.filter((post) => post.pinned).length,
    }),
    [posts]
  );

  const handleCreatePost = async (values: ForumPostFormValues) => {
    if (!author) {
      setActionError("Sign in again before posting.");
      return;
    }

    setActionError("");
    setSubmitting(true);

    try {
      await createForumPost(values, author);
      setCourseFilter(values.courseId);
      setPostFilter(values.type);
    } catch {
      setActionError("Forum post could not be created. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!author || !selectedPost || !replyBody.trim() || selectedPost.locked) return;

    setActionError("");
    setSubmitting(true);

    try {
      await createForumReply(selectedPost, replyBody, author);
      setReplyBody("");
    } catch {
      setActionError("Reply could not be posted. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostAction = async (post: ForumPost, action: (post: ForumPost) => Promise<void>, message: string) => {
    setActionError("");
    setBusyId(post.id);

    try {
      await action(post);
    } catch {
      setActionError(message);
    } finally {
      setBusyId("");
    }
  };

  const handleDeletePost = async (post: ForumPost) => {
    if (!window.confirm(`Delete "${post.title}" and all replies?`)) return;
    await handlePostAction(post, deleteForumPost, "Post could not be deleted.");
  };

  const handleReplyLike = async (reply: ForumReply) => {
    if (!currentUserId) return;
    setBusyId(reply.id);

    try {
      await toggleForumReplyLike(reply, currentUserId);
    } catch {
      setActionError("Reply like could not be updated.");
    } finally {
      setBusyId("");
    }
  };

  const handleDeleteReply = async (post: ForumPost, reply: ForumReply) => {
    setBusyId(reply.id);

    try {
      await deleteForumReply(post, reply);
    } catch {
      setActionError("Reply could not be deleted.");
    } finally {
      setBusyId("");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="h-72 animate-pulse rounded-2xl border border-white/35 bg-[#135d54]/80 shadow-xl" />
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-3">
            {skeletonCards.map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-xl border border-white/45 bg-white/60 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
              />
            ))}
          </div>
          <div className="h-[520px] animate-pulse rounded-xl border border-white/45 bg-white/60 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10" />
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <ForumState
        icon={RefreshCw}
        title="Forums did not load"
        message={error}
        actionLabel="Refresh page"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#135d54] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(216,84,53,0.38),_transparent_34%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Discussion Forums
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              Course discussions, questions, replies, and moderation in one learning space.
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              Educor forums keep classroom discussion searchable, course-scoped, and ready for teacher moderation.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "Posts", value: stats.posts },
              { label: "Questions", value: stats.questions },
              { label: "Pinned", value: stats.pinned },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/20 bg-white/15 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/60">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <ForumPostForm courses={courses} submitting={submitting} onSubmit={handleCreatePost} />

      {actionError && (
        <section className="flex items-start gap-3 rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-[#9d321f]">
          <AlertCircle className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
          <p className="font-semibold">{actionError}</p>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <section className="grid gap-3 rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl lg:grid-cols-[220px_1fr_260px] lg:items-center dark:border-white/10 dark:bg-white/10">
            <label>
              <span className="sr-only">Course filter</span>
              <select
                value={courseFilter}
                onChange={(event) => setCourseFilter(event.target.value)}
                className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
              >
                <option value="all">All courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              {postFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setPostFilter(filter.value)}
                  className={clsx(
                    "rounded-full px-4 py-2 text-sm font-bold transition",
                    postFilter === filter.value
                      ? "bg-[#135d54] text-white"
                      : "bg-[#eef7f4] text-[#52645f] hover:text-[#135d54] dark:bg-white/10 dark:text-white/70"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <label className="relative">
              <span className="sr-only">Search forums</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7d78]"
                size={17}
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search forums"
                className="w-full rounded-full border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
              />
            </label>
          </section>

          {filteredPosts.length === 0 ? (
            <ForumState
              icon={MessageSquare}
              title="No forum posts found"
              message="Start a discussion above or adjust the filters to bring more posts into view."
            />
          ) : (
            <motion.section layout className="grid gap-4">
              <AnimatePresence initial={false}>
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    selected={post.id === selectedPostId}
                    canModerate={canModerate}
                    currentUserId={currentUserId}
                    busy={busyId === post.id || submitting}
                    onSelect={(selected) => {
                      setLoadingReplies(true);
                      setSelectedPostId(selected.id);
                    }}
                    onLike={(selected) =>
                      handlePostAction(
                        selected,
                        (target) => toggleForumPostLike(target, currentUserId),
                        "Post like could not be updated."
                      )
                    }
                    onPin={(selected) => handlePostAction(selected, toggleForumPostPinned, "Pinned state could not be updated.")}
                    onLock={(selected) => handlePostAction(selected, toggleForumPostLocked, "Lock state could not be updated.")}
                    onDelete={handleDeletePost}
                  />
                ))}
              </AnimatePresence>
            </motion.section>
          )}
        </div>

        <aside className="space-y-4">
          {selectedPost ? (
            <section className="overflow-hidden rounded-xl border border-white/45 bg-white/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
              <div className="border-b border-[#dbe7e2] bg-[#f8fbfa]/85 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase text-[#d85435]">Selected thread</p>
                    <h2 className="mt-1 text-2xl font-bold">{selectedPost.title}</h2>
                    <p className="mt-2 text-sm text-[#52645f] dark:text-white/65">
                      {selectedPost.courseTitle} - {selectedPost.authorEmail}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
                    {selectedPost.type === "question" ? <HelpCircle size={22} aria-hidden="true" /> : <BookOpen size={22} aria-hidden="true" />}
                  </span>
                </div>
                <p className="mt-4 leading-7 text-[#52645f] dark:text-white/70">{selectedPost.body}</p>
              </div>

              <div className="max-h-[520px] space-y-3 overflow-y-auto p-5">
                {loadingReplies ? (
                  <div className="flex items-center justify-center py-10 text-[#52645f] dark:text-white/65">
                    <Loader2 className="mr-2 animate-spin" size={18} aria-hidden="true" />
                    Loading replies...
                  </div>
                ) : replies.length === 0 ? (
                  <ForumState icon={Reply} title="No replies yet" message="Add the first reply to move the discussion forward." />
                ) : (
                  replies.map((reply) => (
                    <ReplyCard
                      key={reply.id}
                      post={selectedPost}
                      reply={reply}
                      canModerate={canModerate}
                      currentUserId={currentUserId}
                      busy={busyId === reply.id}
                      onLike={handleReplyLike}
                      onDelete={handleDeleteReply}
                    />
                  ))
                )}
              </div>

              <form onSubmit={handleReply} className="border-t border-[#dbe7e2] bg-white/90 p-4 dark:border-white/10 dark:bg-white/5">
                {selectedPost.locked ? (
                  <div className="rounded-xl bg-[#f0f3f2] p-4 text-sm font-semibold text-[#52645f]">
                    This thread is locked by a teacher.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <label>
                      <span className="sr-only">Reply</span>
                      <textarea
                        value={replyBody}
                        onChange={(event) => setReplyBody(event.target.value)}
                        placeholder="Write a thoughtful reply..."
                        className="min-h-24 w-full resize-none rounded-xl border border-[#c9ded8] bg-white px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={submitting || !replyBody.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send size={18} aria-hidden="true" />
                      {submitting ? "Replying..." : "Reply"}
                    </button>
                  </div>
                )}
              </form>
            </section>
          ) : (
            <ForumState icon={MessageSquare} title="Select a thread" message="Choose a post to read replies and join the discussion." />
          )}
        </aside>
      </section>
    </div>
  );
}
