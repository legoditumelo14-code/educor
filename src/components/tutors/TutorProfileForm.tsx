import { useState, type ChangeEvent, type FormEvent } from "react";
import { BadgeDollarSign, FileUp, PlusCircle, Save, Trash2 } from "lucide-react";
import type {
  TutorAvailabilitySlot,
  TutorProfile,
  TutorProfileFormValues,
  TutorSubject,
} from "../../types/tutor";
import { TUTOR_SUBJECTS } from "../../types/tutor";

interface TutorProfileFormProps {
  profile?: TutorProfile | null;
  submitting: boolean;
  onSubmit: (values: TutorProfileFormValues) => Promise<void>;
}

const createSlot = (): TutorAvailabilitySlot => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  day: "Monday",
  startTime: "15:00",
  endTime: "16:00",
});

const defaultValues = (profile?: TutorProfile | null): TutorProfileFormValues => ({
  displayName: profile?.displayName ?? "",
  headline: profile?.headline ?? "",
  bio: profile?.bio ?? "",
  subjects: profile?.subjects ?? ["Mathematics"],
  hourlyRate: profile?.hourlyRate ?? 25,
  availability: profile?.availability.length ? profile.availability : [createSlot()],
  qualifications: profile?.qualifications ?? [],
  pendingFiles: [],
  active: profile?.active ?? true,
});

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TutorProfileForm({ profile, submitting, onSubmit }: TutorProfileFormProps) {
  const [values, setValues] = useState<TutorProfileFormValues>(() => defaultValues(profile));
  const [validationError, setValidationError] = useState("");

  const updateSubject = (subject: TutorSubject, checked: boolean) => {
    setValues((current) => {
      const subjects = checked
        ? [...current.subjects, subject]
        : current.subjects.filter((item) => item !== subject);

      return { ...current, subjects: subjects.length ? subjects : current.subjects };
    });
  };

  const updateSlot = <Key extends keyof TutorAvailabilitySlot>(
    slotId: string,
    key: Key,
    value: TutorAvailabilitySlot[Key]
  ) => {
    setValues((current) => ({
      ...current,
      availability: current.availability.map((slot) => (slot.id === slotId ? { ...slot, [key]: value } : slot)),
    }));
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setValues((current) => ({ ...current, pendingFiles: [...current.pendingFiles, ...files] }));
    event.target.value = "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (!values.displayName.trim() || !values.headline.trim()) {
      setValidationError("Add a display name and headline.");
      return;
    }

    if (values.hourlyRate <= 0) {
      setValidationError("Set a valid hourly rate.");
      return;
    }

    await onSubmit(values);
    setValues((current) => ({ ...current, pendingFiles: [] }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[#d85435]">Tutor profile</p>
          <h2 className="mt-1 text-2xl font-bold">{profile ? "Update your marketplace profile" : "Create your marketplace profile"}</h2>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
          <BadgeDollarSign size={22} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Display name</span>
          <input
            value={values.displayName}
            onChange={(event) => setValues((current) => ({ ...current, displayName: event.target.value }))}
            placeholder="Ms. Naidoo"
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Hourly rate</span>
          <input
            type="number"
            min={1}
            value={values.hourlyRate}
            onChange={(event) => setValues((current) => ({ ...current, hourlyRate: Number(event.target.value) }))}
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Headline</span>
        <input
          value={values.headline}
          onChange={(event) => setValues((current) => ({ ...current, headline: event.target.value }))}
          placeholder="Exam-focused Mathematics tutor"
          className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Bio</span>
        <textarea
          value={values.bio}
          onChange={(event) => setValues((current) => ({ ...current, bio: event.target.value }))}
          placeholder="Share teaching approach, experience, and learner outcomes."
          className="mt-2 min-h-28 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
      </label>

      <div className="mt-4">
        <p className="text-sm font-semibold text-[#52645f] dark:text-white/70">Subjects</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TUTOR_SUBJECTS.map((subject) => (
            <label key={subject} className="flex items-center gap-2 rounded-lg bg-[#f8fbfa] px-3 py-2 text-sm font-semibold text-[#52645f]">
              <input
                type="checkbox"
                checked={values.subjects.includes(subject)}
                onChange={(event) => updateSubject(subject, event.target.checked)}
                className="h-4 w-4 rounded border-[#c9ded8] text-[#135d54] focus:ring-[#135d54]"
              />
              {subject}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#52645f] dark:text-white/70">Availability</p>
          <button
            type="button"
            onClick={() => setValues((current) => ({ ...current, availability: [...current.availability, createSlot()] }))}
            className="inline-flex items-center gap-2 rounded-full bg-[#eef7f4] px-3 py-2 text-sm font-bold text-[#135d54]"
          >
            <PlusCircle size={16} aria-hidden="true" />
            Add slot
          </button>
        </div>

        <div className="mt-2 grid gap-3">
          {values.availability.map((slot) => (
            <div key={slot.id} className="grid gap-2 rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <select
                value={slot.day}
                onChange={(event) => updateSlot(slot.id, "day", event.target.value)}
                className="rounded-lg border border-[#c9ded8] bg-white px-3 py-2 text-[#17211f]"
              >
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={slot.startTime}
                onChange={(event) => updateSlot(slot.id, "startTime", event.target.value)}
                className="rounded-lg border border-[#c9ded8] bg-white px-3 py-2 text-[#17211f]"
              />
              <input
                type="time"
                value={slot.endTime}
                onChange={(event) => updateSlot(slot.id, "endTime", event.target.value)}
                className="rounded-lg border border-[#c9ded8] bg-white px-3 py-2 text-[#17211f]"
              />
              <button
                type="button"
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    availability: current.availability.filter((item) => item.id !== slot.id),
                  }))
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff1ec] text-[#9d321f]"
                aria-label="Remove availability"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#135d54] shadow-sm">
          <FileUp size={16} aria-hidden="true" />
          Upload qualifications
          <input type="file" multiple className="sr-only" onChange={handleFiles} />
        </label>

        <div className="mt-3 grid gap-2">
          {[...values.qualifications.map((item) => item.name), ...values.pendingFiles.map((file) => file.name)].map((name) => (
            <p key={name} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#52645f]">
              {name}
            </p>
          ))}
          {values.qualifications.length === 0 && values.pendingFiles.length === 0 && (
            <p className="text-sm text-[#6c7d78]">No qualifications uploaded yet.</p>
          )}
        </div>
      </div>

      <label className="mt-4 flex items-center gap-3 font-semibold text-[#52645f] dark:text-white/70">
        <input
          type="checkbox"
          checked={values.active}
          onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))}
          className="h-5 w-5 rounded border-[#c9ded8] text-[#135d54] focus:ring-[#135d54]"
        />
        Visible in marketplace
      </label>

      {validationError && (
        <p className="mt-4 rounded-lg bg-[#fff1ec] px-4 py-3 text-sm font-semibold text-[#9d321f]">
          {validationError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save size={17} aria-hidden="true" />
        {submitting ? "Saving..." : "Save tutor profile"}
      </button>
    </form>
  );
}
