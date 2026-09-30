import { motion } from "framer-motion";
import { Award, BookOpenCheck, Clock, Pencil, Trash2, UserRound } from "lucide-react";
import type { CourseCertificate } from "../../types/certificate";
import type { Course } from "../../types/course";

interface CourseCardProps {
  course: Course;
  canManage: boolean;
  actionBusy: boolean;
  certificate?: CourseCertificate;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
  onComplete?: (course: Course) => void;
}

export default function CourseCard({
  course,
  canManage,
  actionBusy,
  certificate,
  onEdit,
  onDelete,
  onComplete,
}: CourseCardProps) {
  const certificateLabel = certificate
    ? certificate.status === "approved"
      ? "Certificate issued"
      : "Approval pending"
    : "Complete course";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 18 }}
      whileHover={{ y: -4 }}
      className="group overflow-hidden rounded-xl border border-white/45 bg-white/75 shadow-sm backdrop-blur-xl transition hover:shadow-xl dark:border-white/10 dark:bg-white/10"
    >
      <div className="relative h-44 overflow-hidden bg-[#e5f2ef]">
        {course.thumbnailUrl ? (
          <div
            className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-105"
            role="img"
            aria-label={`${course.title} thumbnail`}
            style={{ backgroundImage: `url(${course.thumbnailUrl})` }}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#135d54] via-[#1f7a6c] to-[#d85435] text-white">
            <BookOpenCheck size={42} aria-hidden="true" />
          </div>
        )}
        <div className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-bold uppercase text-[#135d54] backdrop-blur">
          {course.category}
        </div>
        {course.certificateApprovalRequired && (
          <div className="absolute bottom-4 left-4 rounded-full bg-[#fff1ec]/90 px-3 py-1 text-xs font-bold uppercase text-[#9d321f] backdrop-blur">
            Certificate approval
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[#d85435]">{course.level}</p>
            <h3 className="mt-2 text-xl font-bold tracking-normal text-[#17211f] dark:text-white">{course.title}</h3>
          </div>
        </div>

        <p className="mt-3 line-clamp-3 leading-7 text-[#52645f] dark:text-white/70">{course.description}</p>

        <div className="mt-5 grid gap-2 text-sm text-[#52645f] dark:text-white/65">
          <span className="flex items-center gap-2">
            <Clock size={16} aria-hidden="true" />
            {course.duration}
          </span>
          <span className="flex items-center gap-2">
            <UserRound size={16} aria-hidden="true" />
            {course.teacherEmail}
          </span>
        </div>

        {canManage && (
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(course)}
              disabled={actionBusy}
              className="inline-flex items-center gap-2 rounded-full bg-[#ffe8dd] px-4 py-2 text-sm font-semibold text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Pencil size={15} aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(course)}
              disabled={actionBusy}
              className="inline-flex items-center gap-2 rounded-full bg-[#fff1ec] px-4 py-2 text-sm font-semibold text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete
            </button>
          </div>
        )}

        {!canManage && (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => onComplete?.(course)}
              disabled={actionBusy || Boolean(certificate)}
              className="inline-flex items-center gap-2 rounded-full bg-[#135d54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Award size={15} aria-hidden="true" />
              {certificateLabel}
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
}
