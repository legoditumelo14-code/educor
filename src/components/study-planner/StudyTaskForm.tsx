import { useState, type FormEvent } from "react";
import { Bell, CalendarDays, Check, Clock, NotebookPen } from "lucide-react";
import clsx from "clsx";
import type { StudyPlannerType, StudyTask, StudyTaskFormValues, StudyTaskPriority } from "../../types/studyPlanner";

interface StudyTaskFormProps {
  initialTask?: StudyTask | null;
  submitting: boolean;
  onSubmit: (values: StudyTaskFormValues) => Promise<void>;
  onCancel?: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const defaultValues = (): StudyTaskFormValues => ({
  title: "",
  description: "",
  subject: "General",
  plannerType: "daily",
  date: today(),
  startTime: "09:00",
  endTime: "10:00",
  priority: "medium",
  reminderEnabled: true,
  reminderMinutesBefore: 30,
});

const plannerOptions: Array<{ value: StudyPlannerType; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "revision", label: "Revision" },
];

const priorityOptions: Array<{ value: StudyTaskPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const valuesFromTask = (task: StudyTask): StudyTaskFormValues => ({
  title: task.title,
  description: task.description,
  subject: task.subject,
  plannerType: task.plannerType,
  date: task.date || today(),
  startTime: task.startTime || "09:00",
  endTime: task.endTime || "10:00",
  priority: task.priority,
  reminderEnabled: task.reminderEnabled,
  reminderMinutesBefore: task.reminderMinutesBefore,
});

export default function StudyTaskForm({ initialTask, submitting, onSubmit, onCancel }: StudyTaskFormProps) {
  const [values, setValues] = useState<StudyTaskFormValues>(() =>
    initialTask ? valuesFromTask(initialTask) : defaultValues()
  );
  const [validationError, setValidationError] = useState("");

  const updateValue = <Key extends keyof StudyTaskFormValues>(key: Key, value: StudyTaskFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (!values.title.trim()) {
      setValidationError("Add a study task title.");
      return;
    }

    if (!values.date || !values.startTime || !values.endTime) {
      setValidationError("Choose a date, start time, and end time.");
      return;
    }

    if (values.endTime <= values.startTime) {
      setValidationError("End time must be after start time.");
      return;
    }

    await onSubmit(values);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[#d85435]">Planner task</p>
          <h2 className="mt-1 text-2xl font-bold">{initialTask ? "Edit study block" : "Create study block"}</h2>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
          <NotebookPen size={22} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {plannerOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => updateValue("plannerType", option.value)}
            className={clsx(
              "rounded-lg border px-4 py-3 text-sm font-bold transition",
              values.plannerType === option.value
                ? "border-[#135d54] bg-[#135d54] text-white"
                : "border-[#dbe7e2] bg-white/80 text-[#52645f] hover:border-[#135d54] dark:border-white/10 dark:bg-white/5 dark:text-white/70"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Title</span>
          <input
            type="text"
            value={values.title}
            onChange={(event) => updateValue("title", event.target.value)}
            placeholder="Physics revision"
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Subject</span>
          <input
            type="text"
            value={values.subject}
            onChange={(event) => updateValue("subject", event.target.value)}
            placeholder="Science"
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <label>
          <span className="flex items-center gap-2 text-sm font-semibold text-[#52645f] dark:text-white/70">
            <CalendarDays size={16} aria-hidden="true" />
            Date
          </span>
          <input
            type="date"
            value={values.date}
            onChange={(event) => updateValue("date", event.target.value)}
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Priority</span>
          <select
            value={values.priority}
            onChange={(event) => updateValue("priority", event.target.value as StudyTaskPriority)}
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="flex items-center gap-2 text-sm font-semibold text-[#52645f] dark:text-white/70">
            <Clock size={16} aria-hidden="true" />
            Start
          </span>
          <input
            type="time"
            value={values.startTime}
            onChange={(event) => updateValue("startTime", event.target.value)}
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <label>
          <span className="flex items-center gap-2 text-sm font-semibold text-[#52645f] dark:text-white/70">
            <Clock size={16} aria-hidden="true" />
            End
          </span>
          <input
            type="time"
            value={values.endTime}
            onChange={(event) => updateValue("endTime", event.target.value)}
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Notes</span>
        <textarea
          value={values.description}
          onChange={(event) => updateValue("description", event.target.value)}
          placeholder="Key chapters, practice questions, or revision goals"
          className="mt-2 min-h-28 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
      </label>

      <div className="mt-4 grid gap-3 rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5 sm:grid-cols-[1fr_180px] sm:items-center">
        <label className="flex items-center gap-3 font-semibold text-[#52645f] dark:text-white/70">
          <input
            type="checkbox"
            checked={values.reminderEnabled}
            onChange={(event) => updateValue("reminderEnabled", event.target.checked)}
            className="h-5 w-5 rounded border-[#c9ded8] text-[#135d54] focus:ring-[#135d54]"
          />
          <span className="flex items-center gap-2">
            <Bell size={17} aria-hidden="true" />
            Study reminder
          </span>
        </label>

        <label>
          <span className="sr-only">Reminder minutes before</span>
          <select
            value={values.reminderMinutesBefore}
            onChange={(event) => updateValue("reminderMinutesBefore", Number(event.target.value))}
            disabled={!values.reminderEnabled}
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition disabled:cursor-not-allowed disabled:opacity-55"
          >
            <option value={10}>10 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={1440}>1 day</option>
          </select>
        </label>
      </div>

      {validationError && (
        <p className="mt-4 rounded-lg bg-[#fff1ec] px-4 py-3 text-sm font-semibold text-[#9d321f]">
          {validationError}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check size={18} aria-hidden="true" />
          {submitting ? "Saving..." : initialTask ? "Save changes" : "Add task"}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#c9ded8] px-5 py-3 font-semibold text-[#52645f] transition hover:border-[#135d54] hover:text-[#135d54] dark:border-white/10 dark:text-white/70"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
