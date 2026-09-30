import { motion } from "framer-motion";
import { CheckCircle2, Edit3, Eye, FileText, Send, Trash2 } from "lucide-react";
import type { Lesson, LessonProgress } from "../../types/lesson";

interface LessonCardProps {
  lesson: Lesson;
  progress?: LessonProgress;
  canManage: boolean;
  busy: boolean;
  onView: (lesson: Lesson) => void;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onPublish: (lesson: Lesson) => void;
}

export default function LessonCard({
  lesson,
  progress,
  canManage,
  busy,
  onView,
  onEdit,
  onDelete,
  onPublish,
}: LessonCardProps) {
  const resourceCount = lesson.sections.reduce((total, section) => total + section.resources.length, 0);
  const progressPercent = progress?.progressPercent ?? 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl transition hover:shadow-xl dark:border-white/10 dark:bg-white/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
              lesson.status === "published"
                ? "bg-[#e5f2ef] text-[#135d54]"
                : "bg-[#fff1ec] text-[#9d321f]"
            }`}
          >
            {lesson.status}
          </span>
          <h3 className="mt-4 text-xl font-bold tracking-normal">{lesson.title}</h3>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
          <FileText size={24} aria-hidden="true" />
        </div>
      </div>

      <p className="mt-3 line-clamp-3 leading-7 text-[#52645f] dark:text-white/70">{lesson.summary}</p>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-[#eef7f4] p-3 text-[#135d54]">
          <p className="text-lg font-bold">{lesson.sections.length}</p>
          <p className="text-xs font-semibold">Sections</p>
        </div>
        <div className="rounded-lg bg-[#fff1ec] p-3 text-[#9d321f]">
          <p className="text-lg font-bold">{resourceCount}</p>
          <p className="text-xs font-semibold">Files</p>
        </div>
        <div className="rounded-lg bg-white p-3 text-[#52645f] shadow-sm dark:bg-white/10 dark:text-white/70">
          <p className="text-lg font-bold">{progressPercent}%</p>
          <p className="text-xs font-semibold">Read</p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dbe7e2] dark:bg-white/10">
        <div className="h-full rounded-full bg-[#d85435]" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onView(lesson)}
          className="inline-flex items-center gap-2 rounded-full bg-[#135d54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f4942]"
        >
          {progress?.completed ? <CheckCircle2 size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          {progress?.completed ? "Review" : "View"}
        </button>

        {canManage && (
          <>
            <button
              type="button"
              onClick={() => onEdit(lesson)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-[#ffe8dd] px-4 py-2 text-sm font-semibold text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:opacity-60"
            >
              <Edit3 size={16} aria-hidden="true" />
              Edit
            </button>
            {lesson.status === "draft" && (
              <button
                type="button"
                onClick={() => onPublish(lesson)}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-[#e5f2ef] px-4 py-2 text-sm font-semibold text-[#135d54] transition hover:bg-[#dbe7e2] disabled:opacity-60"
              >
                <Send size={16} aria-hidden="true" />
                Publish
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(lesson)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-[#fff1ec] px-4 py-2 text-sm font-semibold text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:opacity-60"
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </button>
          </>
        )}
      </div>
    </motion.article>
  );
}
