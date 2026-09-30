import { useState } from "react";
import { ArrowDown, ArrowUp, FileUp, Loader2, Plus, Save, Send, Trash2 } from "lucide-react";
import type { Lesson, LessonFormValues, LessonSectionDraft, LessonStatus } from "../../types/lesson";
import LessonResourceList from "./LessonResourceList";

interface LessonFormProps {
  initialLesson?: Lesson | null;
  submitting: boolean;
  onSubmit: (values: LessonFormValues) => Promise<void>;
  onCancel?: () => void;
}

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createBlankSection = (order = 0): LessonSectionDraft => ({
  id: createId(),
  title: "",
  body: "",
  order,
  resources: [],
  pendingFiles: [],
});

const initialSections = (lesson?: Lesson | null): LessonSectionDraft[] =>
  lesson?.sections.length
    ? lesson.sections.map((section, index) => ({
        ...section,
        order: index,
        pendingFiles: [],
      }))
    : [createBlankSection()];

const fileAccept = "application/pdf,image/*,video/*";

export default function LessonForm({ initialLesson, submitting, onSubmit, onCancel }: LessonFormProps) {
  const [title, setTitle] = useState(initialLesson?.title ?? "");
  const [summary, setSummary] = useState(initialLesson?.summary ?? "");
  const [sections, setSections] = useState<LessonSectionDraft[]>(() => initialSections(initialLesson));
  const [error, setError] = useState("");

  const updateSection = <K extends keyof LessonSectionDraft>(
    sectionId: string,
    key: K,
    value: LessonSectionDraft[K]
  ) => {
    setSections((current) =>
      current.map((section) => (section.id === sectionId ? { ...section, [key]: value } : section))
    );
  };

  const addSection = () => {
    setSections((current) => [...current, createBlankSection(current.length)]);
  };

  const removeSection = (sectionId: string) => {
    setSections((current) => {
      if (current.length === 1) return current;
      return current.filter((section) => section.id !== sectionId).map((section, index) => ({ ...section, order: index }));
    });
  };

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    setSections((current) => {
      const index = current.findIndex((section) => section.id === sectionId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);

      return next.map((section, order) => ({ ...section, order }));
    });
  };

  const addPendingFiles = (sectionId: string, files: FileList | null) => {
    if (!files?.length) return;

    const validFiles = Array.from(files).filter((file) => {
      const isSupported =
        file.type === "application/pdf" || file.type.startsWith("image/") || file.type.startsWith("video/");
      const isSmallEnough = file.size <= 100 * 1024 * 1024;
      return isSupported && isSmallEnough;
    });

    if (validFiles.length !== files.length) {
      setError("Only PDF, image, and video files up to 100MB can be attached.");
    }

    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              pendingFiles: [...section.pendingFiles, ...validFiles],
            }
          : section
      )
    );
  };

  const removePendingFile = (sectionId: string, fileIndex: number) => {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              pendingFiles: section.pendingFiles.filter((_, index) => index !== fileIndex),
            }
          : section
      )
    );
  };

  const removeResource = (sectionId: string, resourceId: string) => {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              resources: section.resources.filter((resource) => resource.id !== resourceId),
            }
          : section
      )
    );
  };

  const submitLesson = async (status: LessonStatus) => {
    setError("");

    const cleanedSections = sections.map((section, index) => ({
      ...section,
      title: section.title.trim(),
      body: section.body.trim(),
      order: index,
    }));

    if (!title.trim() || !summary.trim()) {
      setError("Add a lesson title and summary before saving.");
      return;
    }

    if (cleanedSections.some((section) => !section.title || !section.body)) {
      setError("Every section needs a title and body.");
      return;
    }

    await onSubmit({
      title,
      summary,
      status,
      sections: cleanedSections,
    });
  };

  return (
    <section className="rounded-2xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase text-[#d85435]">Lesson Builder</p>
          <h2 className="mt-2 text-2xl font-bold">
            {initialLesson ? "Edit lesson" : "Create a structured lesson"}
          </h2>
          <p className="mt-2 max-w-3xl leading-7 text-[#52645f] dark:text-white/65">
            Build lessons in sections, attach PDFs, videos, and images, then save a draft or publish for students.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-[#eef7f4] px-4 py-2 text-sm font-semibold text-[#52645f] transition hover:text-[#135d54]"
          >
            Cancel editing
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Lesson title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: Introduction to algebraic thinking"
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Status</span>
          <div className="rounded-lg border border-[#c9ded8] bg-[#eef7f4] px-4 py-3 text-sm font-semibold text-[#135d54]">
            {initialLesson?.status === "published" ? "Published lesson" : "Draft-ready lesson"}
          </div>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Summary</span>
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Summarise the learning outcome for students."
          className="min-h-24 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
      </label>

      <div className="mt-6 space-y-4">
        {sections.map((section, index) => (
          <article
            key={section.id}
            className="rounded-xl border border-[#dbe7e2] bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <p className="text-sm font-semibold uppercase text-[#135d54]">Section {index + 1}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => moveSection(section.id, "up")}
                  disabled={index === 0}
                  className="rounded-full bg-[#eef7f4] p-2 text-[#52645f] transition hover:text-[#135d54] disabled:opacity-40"
                  aria-label="Move section up"
                >
                  <ArrowUp size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(section.id, "down")}
                  disabled={index === sections.length - 1}
                  className="rounded-full bg-[#eef7f4] p-2 text-[#52645f] transition hover:text-[#135d54] disabled:opacity-40"
                  aria-label="Move section down"
                >
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(section.id)}
                  disabled={sections.length === 1}
                  className="rounded-full bg-[#fff1ec] p-2 text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:opacity-40"
                  aria-label="Delete section"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={section.title}
                onChange={(event) => updateSection(section.id, "title", event.target.value)}
                placeholder="Section title"
                className="w-full rounded-lg border border-[#c9ded8] bg-white px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
              />
              <textarea
                value={section.body}
                onChange={(event) => updateSection(section.id, "body", event.target.value)}
                placeholder="Write the lesson content students should read here."
                className="min-h-36 w-full rounded-lg border border-[#c9ded8] bg-white px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
              />
            </div>

            <LessonResourceList resources={section.resources} onRemove={(resourceId) => removeResource(section.id, resourceId)} />

            {section.pendingFiles.length > 0 && (
              <div className="mt-4 rounded-lg bg-[#eef7f4] p-3">
                <p className="text-xs font-semibold uppercase text-[#135d54]">Ready to upload</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {section.pendingFiles.map((file, fileIndex) => (
                    <button
                      type="button"
                      key={`${file.name}-${fileIndex}`}
                      onClick={() => removePendingFile(section.id, fileIndex)}
                      className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#52645f] shadow-sm"
                    >
                      {file.name} - remove
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#b7d5ce] bg-white px-4 py-2 text-sm font-semibold text-[#135d54] transition hover:border-[#135d54]">
              <FileUp size={16} aria-hidden="true" />
              Attach PDF, video, or image
              <input
                type="file"
                multiple
                accept={fileAccept}
                className="sr-only"
                onChange={(event) => addPendingFiles(section.id, event.target.files)}
              />
            </label>
          </article>
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-[#fff1ec] px-4 py-3 text-sm text-[#9d321f]">{error}</p>}

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={addSection}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#b7d5ce] bg-white px-5 py-3 font-semibold text-[#135d54] transition hover:border-[#135d54]"
        >
          <Plus size={18} aria-hidden="true" />
          Add section
        </button>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => submitLesson("draft")}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#eef7f4] px-5 py-3 font-semibold text-[#135d54] transition hover:bg-[#dbe7e2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
            Save draft
          </button>
          <button
            type="button"
            onClick={() => submitLesson("published")}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
            Publish
          </button>
        </div>
      </div>
    </section>
  );
}
