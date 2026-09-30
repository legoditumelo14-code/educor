import { useState, type FormEvent } from "react";
import { CalendarPlus, Check, Clock, Users } from "lucide-react";
import type {
  CalendarAudience,
  CalendarCustomEventType,
  CalendarEvent,
  CalendarEventFormValues,
  CalendarUserRole,
} from "../../types/calendar";

interface CalendarEventFormProps {
  role: CalendarUserRole;
  initialEvent?: CalendarEvent | null;
  submitting: boolean;
  onSubmit: (values: CalendarEventFormValues) => Promise<void>;
  onCancel?: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const defaultValues = (role: CalendarUserRole): CalendarEventFormValues => ({
  type: role === "teacher" ? "event" : "schedule",
  title: "",
  description: "",
  date: today(),
  startTime: "09:00",
  endTime: "10:00",
  audience: role === "teacher" ? "all" : "personal",
});

const valuesFromEvent = (event: CalendarEvent, role: CalendarUserRole): CalendarEventFormValues => ({
  type:
    event.type === "exam" || event.type === "event" || event.type === "deadline" || event.type === "schedule"
      ? event.type
      : role === "teacher"
        ? "event"
        : "schedule",
  title: event.title,
  description: event.description,
  date: event.date || today(),
  startTime: event.startTime || "09:00",
  endTime: event.endTime || "10:00",
  audience: role === "teacher" ? event.audience : "personal",
});

const teacherEventTypes: Array<{ value: CalendarCustomEventType; label: string }> = [
  { value: "exam", label: "Exam" },
  { value: "event", label: "Event" },
  { value: "deadline", label: "Deadline" },
  { value: "schedule", label: "Schedule" },
];

const studentEventTypes: Array<{ value: CalendarCustomEventType; label: string }> = [
  { value: "schedule", label: "Schedule" },
  { value: "event", label: "Event" },
];

const audienceOptions: Array<{ value: CalendarAudience; label: string }> = [
  { value: "all", label: "Everyone" },
  { value: "teachers", label: "Teachers" },
  { value: "students", label: "Students" },
  { value: "personal", label: "Personal" },
];

export default function CalendarEventForm({
  role,
  initialEvent,
  submitting,
  onSubmit,
  onCancel,
}: CalendarEventFormProps) {
  const [values, setValues] = useState<CalendarEventFormValues>(() =>
    initialEvent ? valuesFromEvent(initialEvent, role) : defaultValues(role)
  );
  const [validationError, setValidationError] = useState("");
  const eventTypes = role === "teacher" ? teacherEventTypes : studentEventTypes;

  const updateValue = <Key extends keyof CalendarEventFormValues>(
    key: Key,
    value: CalendarEventFormValues[Key]
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (!values.title.trim()) {
      setValidationError("Add a calendar title.");
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
          <p className="text-sm font-semibold uppercase text-[#d85435]">Calendar item</p>
          <h2 className="mt-1 text-2xl font-bold">{initialEvent ? "Edit event" : "Create event"}</h2>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
          <CalendarPlus size={22} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Type</span>
          <select
            value={values.type}
            onChange={(event) => updateValue("type", event.target.value as CalendarCustomEventType)}
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          >
            {eventTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="flex items-center gap-2 text-sm font-semibold text-[#52645f] dark:text-white/70">
            <Users size={16} aria-hidden="true" />
            Audience
          </span>
          <select
            value={role === "student" ? "personal" : values.audience}
            onChange={(event) => updateValue("audience", event.target.value as CalendarAudience)}
            disabled={role === "student"}
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition disabled:cursor-not-allowed disabled:opacity-55 focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          >
            {audienceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="md:col-span-2">
          <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Title</span>
          <input
            type="text"
            value={values.title}
            onChange={(event) => updateValue("title", event.target.value)}
            placeholder={role === "teacher" ? "Grade 10 exam" : "Study group"}
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Date</span>
          <input
            type="date"
            value={values.date}
            onChange={(event) => updateValue("date", event.target.value)}
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
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
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Details</span>
        <textarea
          value={values.description}
          onChange={(event) => updateValue("description", event.target.value)}
          placeholder="Room, agenda, preparation notes, or schedule context"
          className="mt-2 min-h-28 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
      </label>

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
          {submitting ? "Saving..." : initialEvent ? "Save changes" : "Add event"}
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
