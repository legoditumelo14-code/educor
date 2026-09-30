import { motion } from "framer-motion";
import {
  Bell,
  CalendarPlus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import clsx from "clsx";
import { downloadStudyTaskCalendar, googleCalendarUrl } from "../../lib/studyPlanner";
import type { StudyTask } from "../../types/studyPlanner";

interface StudyTaskCardProps {
  task: StudyTask;
  busy: boolean;
  onToggle: (task: StudyTask) => void;
  onEdit: (task: StudyTask) => void;
  onDelete: (task: StudyTask) => void;
}

const priorityStyles: Record<StudyTask["priority"], string> = {
  low: "bg-[#eef7f4] text-[#135d54]",
  medium: "bg-[#edf5fb] text-[#2f6f9f]",
  high: "bg-[#fff1ec] text-[#9d321f]",
};

const plannerLabels: Record<StudyTask["plannerType"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  revision: "Revision",
};

const formatDate = (date: string) => {
  if (!date) return "Unscheduled";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export default function StudyTaskCard({ task, busy, onToggle, onEdit, onDelete }: StudyTaskCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className={clsx(
        "rounded-xl border p-5 shadow-sm backdrop-blur-xl transition",
        task.completed
          ? "border-[#b7d5ce] bg-[#eef7f4]/85"
          : "border-white/45 bg-white/75 dark:border-white/10 dark:bg-white/10"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onToggle(task)}
            disabled={busy}
            className={clsx(
              "mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60",
              task.completed
                ? "border-[#135d54] bg-[#135d54] text-white"
                : "border-[#c9ded8] bg-white text-[#52645f] hover:border-[#135d54] hover:text-[#135d54]"
            )}
            aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
          >
            {task.completed ? <CheckCircle2 size={21} aria-hidden="true" /> : <XCircle size={21} aria-hidden="true" />}
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-[#52645f] shadow-sm">
                {plannerLabels[task.plannerType]}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityStyles[task.priority]}`}>
                {task.priority}
              </span>
            </div>
            <h3 className={clsx("mt-3 text-xl font-bold", task.completed && "text-[#135d54] line-through")}>
              {task.title}
            </h3>
            <p className="mt-1 text-sm font-semibold text-[#52645f] dark:text-white/65">{task.subject}</p>
            {task.description && (
              <p className="mt-3 leading-7 text-[#52645f] dark:text-white/65">{task.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(task)}
            disabled={busy}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#c9ded8] bg-white/80 text-[#52645f] transition hover:border-[#135d54] hover:text-[#135d54] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Edit study task"
            title="Edit"
          >
            <Pencil size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
            disabled={busy}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#ffd8c9] bg-[#fff1ec] text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Delete study task"
            title="Delete"
          >
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-[#52645f] dark:text-white/65 md:grid-cols-3">
        <span className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 dark:bg-white/5">
          <Clock size={16} aria-hidden="true" />
          {formatDate(task.date)}
        </span>
        <span className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 dark:bg-white/5">
          <Clock size={16} aria-hidden="true" />
          {task.startTime} - {task.endTime}
        </span>
        <span className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 dark:bg-white/5">
          <Bell size={16} aria-hidden="true" />
          {task.reminderEnabled ? `${task.reminderMinutesBefore} min reminder` : "No reminder"}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => downloadStudyTaskCalendar(task)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#c9ded8] bg-white/80 px-4 py-2 text-sm font-bold text-[#52645f] transition hover:border-[#135d54] hover:text-[#135d54]"
        >
          <CalendarPlus size={16} aria-hidden="true" />
          Download .ics
        </button>
        <a
          href={googleCalendarUrl(task)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#edf5fb] px-4 py-2 text-sm font-bold text-[#2f6f9f] transition hover:bg-[#d9ebf7]"
        >
          <ExternalLink size={16} aria-hidden="true" />
          Google Calendar
        </a>
      </div>
    </motion.article>
  );
}
