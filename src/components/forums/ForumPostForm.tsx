import { useEffect, useState, type FormEvent } from "react";
import { HelpCircle, MessageSquarePlus, Send } from "lucide-react";
import clsx from "clsx";
import type { Course } from "../../types/course";
import type { ForumPostFormValues, ForumPostType } from "../../types/forum";

interface ForumPostFormProps {
  courses: Course[];
  submitting: boolean;
  onSubmit: (values: ForumPostFormValues) => Promise<void>;
}

const postTypeOptions: Array<{ value: ForumPostType; label: string }> = [
  { value: "discussion", label: "Discussion" },
  { value: "question", label: "Question" },
];

const defaultValues = (courses: Course[]): ForumPostFormValues => ({
  courseId: courses[0]?.id ?? "general",
  courseTitle: courses[0]?.title ?? "General discussion",
  type: "discussion",
  title: "",
  body: "",
});

export default function ForumPostForm({ courses, submitting, onSubmit }: ForumPostFormProps) {
  const [values, setValues] = useState<ForumPostFormValues>(() => defaultValues(courses));
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (values.courseId !== "general" || courses.length === 0) return;
    const timer = window.setTimeout(() => setValues((current) => ({ ...current, ...defaultValues(courses) })), 0);
    return () => window.clearTimeout(timer);
  }, [courses, values.courseId]);

  const handleCourseChange = (courseId: string) => {
    const course = courses.find((item) => item.id === courseId);
    setValues((current) => ({
      ...current,
      courseId: course?.id ?? "general",
      courseTitle: course?.title ?? "General discussion",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (!values.title.trim()) {
      setValidationError("Add a title for the forum post.");
      return;
    }

    if (!values.body.trim()) {
      setValidationError("Add discussion details before posting.");
      return;
    }

    await onSubmit(values);
    setValues(defaultValues(courses));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[#d85435]">Forum post</p>
          <h2 className="mt-1 text-2xl font-bold">Start a course discussion</h2>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
          <MessageSquarePlus size={22} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Course</span>
          <select
            value={values.courseId}
            onChange={(event) => handleCourseChange(event.target.value)}
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          >
            {courses.length === 0 && <option value="general">General discussion</option>}
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="flex items-center gap-2 text-sm font-semibold text-[#52645f] dark:text-white/70">
            <HelpCircle size={16} aria-hidden="true" />
            Type
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {postTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setValues((current) => ({ ...current, type: option.value }))}
                className={clsx(
                  "rounded-lg border px-4 py-3 text-sm font-bold transition",
                  values.type === option.value
                    ? "border-[#135d54] bg-[#135d54] text-white"
                    : "border-[#dbe7e2] bg-white/80 text-[#52645f] hover:border-[#135d54] dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Title</span>
        <input
          type="text"
          value={values.title}
          onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
          placeholder="How should we approach this topic?"
          className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Details</span>
        <textarea
          value={values.body}
          onChange={(event) => setValues((current) => ({ ...current, body: event.target.value }))}
          placeholder="Share the context, question, or idea classmates should respond to."
          className="mt-2 min-h-28 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
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
        <Send size={17} aria-hidden="true" />
        {submitting ? "Posting..." : "Post to forum"}
      </button>
    </form>
  );
}
