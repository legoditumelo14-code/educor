import { useState } from "react";
import { CalendarClock, FileUp, Loader2, Save, Trash2, X } from "lucide-react";
import type { Assignment, AssignmentFormValues } from "../../types/assignment";
import AssignmentResourceList from "./AssignmentResourceList";

interface AssignmentFormProps {
  initialAssignment?: Assignment | null;
  submitting: boolean;
  onSubmit: (values: AssignmentFormValues) => Promise<void>;
  onCancel?: () => void;
}

const createInitialValues = (assignment?: Assignment | null): AssignmentFormValues => ({
  title: assignment?.title ?? "",
  instructions: assignment?.instructions ?? "",
  dueDate: assignment?.dueDate ?? "",
  maxMarks: assignment?.maxMarks ?? 100,
  resources: assignment?.resources ?? [],
  pendingFiles: [],
});

const acceptedFiles = ".pdf,.doc,.docx,.txt,image/*,video/*";
const maxFileSize = 100 * 1024 * 1024;

export default function AssignmentForm({ initialAssignment, submitting, onSubmit, onCancel }: AssignmentFormProps) {
  const [values, setValues] = useState<AssignmentFormValues>(() => createInitialValues(initialAssignment));
  const [error, setError] = useState("");

  const updateValue = <K extends keyof AssignmentFormValues>(key: K, value: AssignmentFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;

    const validFiles = Array.from(files).filter((file) => file.size <= maxFileSize);

    if (validFiles.length !== files.length) {
      setError("Attachments must be 100MB or smaller.");
    }

    updateValue("pendingFiles", [...values.pendingFiles, ...validFiles]);
  };

  const removePendingFile = (fileIndex: number) => {
    updateValue(
      "pendingFiles",
      values.pendingFiles.filter((_, index) => index !== fileIndex)
    );
  };

  const removeResource = (resourceId: string) => {
    updateValue(
      "resources",
      values.resources.filter((resource) => resource.id !== resourceId)
    );
  };

  const submitForm = async () => {
    setError("");

    if (!values.title.trim() || !values.instructions.trim() || !values.dueDate) {
      setError("Add a title, instructions, and due date before saving.");
      return;
    }

    if (!Number.isFinite(values.maxMarks) || values.maxMarks <= 0) {
      setError("Marks must be a positive number.");
      return;
    }

    await onSubmit({
      ...values,
      title: values.title.trim(),
      instructions: values.instructions.trim(),
      maxMarks: Number(values.maxMarks),
    });

    if (!initialAssignment) {
      setValues(createInitialValues());
    }
  };

  return (
    <section className="rounded-2xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-semibold uppercase text-[#d85435]">Assignment manager</p>
          <h2 className="mt-2 text-2xl font-bold">{initialAssignment ? "Edit assignment" : "Create assignment"}</h2>
          <p className="mt-2 max-w-3xl leading-7 text-[#52645f] dark:text-white/65">
            Set a deadline, add clear instructions, attach support files, and define the marks students are working toward.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-full bg-[#eef7f4] px-4 py-2 text-sm font-semibold text-[#52645f] transition hover:text-[#135d54]"
          >
            <X size={16} aria-hidden="true" />
            Cancel editing
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px_180px]">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Title</span>
          <input
            value={values.title}
            onChange={(event) => updateValue("title", event.target.value)}
            placeholder="Example: Algebra checkpoint"
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Due date</span>
          <div className="relative">
            <CalendarClock className="absolute left-3 top-3 text-[#78918a]" size={18} aria-hidden="true" />
            <input
              type="date"
              value={values.dueDate}
              onChange={(event) => updateValue("dueDate", event.target.value)}
              className="w-full rounded-lg border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Marks</span>
          <input
            type="number"
            min={1}
            value={values.maxMarks}
            onChange={(event) => updateValue("maxMarks", Number(event.target.value))}
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Instructions</span>
        <textarea
          value={values.instructions}
          onChange={(event) => updateValue("instructions", event.target.value)}
          placeholder="Explain what students need to submit and how marks will be awarded."
          className="min-h-32 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
      </label>

      <AssignmentResourceList resources={values.resources} onRemove={removeResource} />

      {values.pendingFiles.length > 0 && (
        <div className="mt-4 rounded-lg bg-[#eef7f4] p-3">
          <p className="text-xs font-semibold uppercase text-[#135d54]">Ready to upload</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {values.pendingFiles.map((file, fileIndex) => (
              <button
                type="button"
                key={`${file.name}-${fileIndex}`}
                onClick={() => removePendingFile(fileIndex)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#52645f] shadow-sm"
              >
                {file.name}
                <Trash2 size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-4 rounded-lg bg-[#fff1ec] px-4 py-3 text-sm text-[#9d321f]">{error}</p>}

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-[#b7d5ce] bg-white px-5 py-3 font-semibold text-[#135d54] transition hover:border-[#135d54]">
          <FileUp size={18} aria-hidden="true" />
          Attach files
          <input
            type="file"
            multiple
            accept={acceptedFiles}
            className="sr-only"
            onChange={(event) => addFiles(event.target.files)}
          />
        </label>

        <button
          type="button"
          onClick={submitForm}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
          {submitting ? "Saving..." : initialAssignment ? "Save changes" : "Create assignment"}
        </button>
      </div>
    </section>
  );
}
