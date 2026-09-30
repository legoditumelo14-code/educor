import { type FormEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Save, X } from "lucide-react";
import {
  COURSE_CATEGORIES,
  COURSE_LEVELS,
  type Course,
  type CourseCategory,
  type CourseFormValues,
  type CourseLevel,
} from "../../types/course";

interface CourseFormProps {
  mode: "create" | "edit";
  initialCourse?: Course | null;
  submitting: boolean;
  onSubmit: (values: CourseFormValues, thumbnail: File | null) => Promise<void>;
  onCancel?: () => void;
}

const emptyValues: CourseFormValues = {
  title: "",
  description: "",
  category: "Technology",
  level: "Beginner",
  duration: "",
  certificateApprovalRequired: false,
};

const fileSizeLimit = 4 * 1024 * 1024;

const getInitialValues = (course?: Course | null): CourseFormValues =>
  course
    ? {
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        duration: course.duration,
        certificateApprovalRequired: course.certificateApprovalRequired,
      }
    : emptyValues;

export default function CourseForm({ mode, initialCourse, submitting, onSubmit, onCancel }: CourseFormProps) {
  const [values, setValues] = useState<CourseFormValues>(() => getInitialValues(initialCourse));
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialCourse?.thumbnailUrl ?? "");
  const [localError, setLocalError] = useState("");
  const objectUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const updateValue = <K extends keyof CourseFormValues>(key: K, value: CourseFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleFileChange = (file: File | undefined) => {
    setLocalError("");
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLocalError("Please upload an image file for the course thumbnail.");
      return;
    }

    if (file.size > fileSizeLimit) {
      setLocalError("Thumbnail images must be smaller than 4MB.");
      return;
    }

    setThumbnail(file);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (!values.title.trim() || !values.description.trim() || !values.duration.trim()) {
      setLocalError("Add a title, description, and duration before saving.");
      return;
    }

    await onSubmit(
      {
        ...values,
        title: values.title.trim(),
        description: values.description.trim(),
        duration: values.duration.trim(),
      },
      thumbnail
    );

    if (mode === "create") {
      setValues(emptyValues);
      setThumbnail(null);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = "";
      }
      setPreviewUrl("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
    >
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-semibold uppercase text-[#d85435]">
            {mode === "create" ? "Teacher course builder" : "Edit course"}
          </p>
          <h2 className="mt-2 text-2xl font-bold">{mode === "create" ? "Create a course" : values.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52645f] dark:text-white/65">
            Add a concise course promise, category, level, and a thumbnail that helps learners quickly choose the right path.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-full bg-[#eef7f4] px-4 py-2 text-sm font-semibold text-[#52645f] transition hover:text-[#135d54]"
          >
            <X size={16} aria-hidden="true" />
            Cancel
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[280px_1fr]">
        <label className="group relative flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#b7d5ce] bg-[#eef7f4]/70 text-center transition hover:border-[#135d54] dark:border-white/15 dark:bg-white/5">
          {previewUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              role="img"
              aria-label="Course thumbnail preview"
              style={{ backgroundImage: `url(${previewUrl})` }}
            />
          ) : (
            <div className="relative z-10 px-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-white text-[#135d54] shadow-sm">
                <ImagePlus size={26} aria-hidden="true" />
              </div>
              <p className="mt-4 font-semibold">Upload thumbnail</p>
              <p className="mt-2 text-sm leading-6 text-[#52645f] dark:text-white/65">PNG or JPG, up to 4MB</p>
            </div>
          )}

          {previewUrl && (
            <div className="absolute inset-x-0 bottom-0 bg-black/55 px-4 py-3 text-sm font-semibold text-white backdrop-blur">
              Replace thumbnail
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />
        </label>

        <div className="grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Course title</span>
            <input
              value={values.title}
              onChange={(event) => updateValue("title", event.target.value)}
              placeholder="Example: Grade 10 Mathematics Foundations"
              className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Description</span>
            <textarea
              value={values.description}
              onChange={(event) => updateValue("description", event.target.value)}
              placeholder="Describe what learners will achieve and why this course matters."
              className="min-h-32 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Category</span>
              <select
                value={values.category}
                onChange={(event) => updateValue("category", event.target.value as CourseCategory)}
                className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
              >
                {COURSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Level</span>
              <select
                value={values.level}
                onChange={(event) => updateValue("level", event.target.value as CourseLevel)}
                className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
              >
                {COURSE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Duration</span>
              <input
                value={values.duration}
                onChange={(event) => updateValue("duration", event.target.value)}
                placeholder="6 weeks"
                className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
              />
            </label>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f]">
            <span>
              <span className="block font-semibold">Teacher approval for certificates</span>
              <span className="mt-1 block text-sm text-[#52645f]">
                Require approval before completed learners receive an issued certificate.
              </span>
            </span>
            <input
              type="checkbox"
              checked={values.certificateApprovalRequired}
              onChange={(event) => updateValue("certificateApprovalRequired", event.target.checked)}
              className="h-5 w-5 accent-[#135d54]"
            />
          </label>
        </div>
      </div>

      {localError && <p className="mt-4 rounded-lg bg-[#fff1ec] px-4 py-3 text-sm text-[#9d321f]">{localError}</p>}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-65"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
          {submitting ? "Saving..." : mode === "create" ? "Publish course" : "Save changes"}
        </button>
        <p className="text-sm text-[#52645f] dark:text-white/60">
          Students can browse published courses immediately after saving.
        </p>
      </div>
    </form>
  );
}
