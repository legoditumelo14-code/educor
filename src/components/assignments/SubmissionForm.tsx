import { useState } from "react";
import { FileUp, Loader2, Send, Trash2 } from "lucide-react";
import type { AssignmentSubmission, SubmissionFormValues } from "../../types/assignment";
import AssignmentResourceList from "./AssignmentResourceList";

interface SubmissionFormProps {
  existingSubmission?: AssignmentSubmission;
  locked: boolean;
  submitting: boolean;
  onSaveDraft: (values: SubmissionFormValues) => Promise<void>;
  onSubmit: (values: SubmissionFormValues) => Promise<void>;
}

const createInitialValues = (submission?: AssignmentSubmission): SubmissionFormValues => ({
  note: submission?.note ?? "",
  resources: submission?.resources ?? [],
  pendingFiles: [],
});

const acceptedFiles = ".pdf,.doc,.docx,.txt,image/*,video/*";
const maxFileSize = 100 * 1024 * 1024;

export default function SubmissionForm({
  existingSubmission,
  locked,
  submitting,
  onSaveDraft,
  onSubmit,
}: SubmissionFormProps) {
  const [values, setValues] = useState<SubmissionFormValues>(() => createInitialValues(existingSubmission));
  const [error, setError] = useState("");

  const updateValue = <K extends keyof SubmissionFormValues>(key: K, value: SubmissionFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const addFiles = (files: FileList | null) => {
    if (!files?.length || locked) return;

    const validFiles = Array.from(files).filter((file) => file.size <= maxFileSize);
    if (validFiles.length !== files.length) {
      setError("Submission files must be 100MB or smaller.");
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
    if (locked) return;

    updateValue(
      "resources",
      values.resources.filter((resource) => resource.id !== resourceId)
    );
  };

  const validate = () => {
    if (!values.note.trim() && values.resources.length === 0 && values.pendingFiles.length === 0) {
      setError("Add a short note or upload at least one file before saving.");
      return false;
    }

    setError("");
    return true;
  };

  const handleDraft = async () => {
    if (!validate()) return;
    await onSaveDraft({ ...values, note: values.note.trim() });
    setValues((current) => ({ ...current, pendingFiles: [] }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit({ ...values, note: values.note.trim() });
    setValues((current) => ({ ...current, pendingFiles: [] }));
  };

  return (
    <div className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-semibold uppercase text-[#135d54]">Your submission</p>
          <p className="mt-1 text-sm leading-6 text-[#52645f] dark:text-white/65">
            {locked
              ? "The deadline has passed, so this submission can no longer be edited."
              : "You can save a draft or edit your submission until the due date."}
          </p>
        </div>
        {existingSubmission && (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-[#52645f] shadow-sm dark:bg-white/10 dark:text-white/70">
            {existingSubmission.status.replace("_", " ")}
          </span>
        )}
      </div>

      <textarea
        value={values.note}
        onChange={(event) => updateValue("note", event.target.value)}
        disabled={locked}
        placeholder="Add a note for your teacher."
        className="mt-4 min-h-24 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce] disabled:cursor-not-allowed disabled:opacity-70"
      />

      <AssignmentResourceList resources={values.resources} onRemove={locked ? undefined : removeResource} />

      {values.pendingFiles.length > 0 && (
        <div className="mt-4 rounded-lg bg-white p-3 shadow-sm dark:bg-white/10">
          <p className="text-xs font-semibold uppercase text-[#135d54]">Ready to upload</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {values.pendingFiles.map((file, fileIndex) => (
              <button
                type="button"
                key={`${file.name}-${fileIndex}`}
                onClick={() => removePendingFile(fileIndex)}
                className="inline-flex items-center gap-2 rounded-full bg-[#eef7f4] px-3 py-1 text-sm font-semibold text-[#52645f]"
              >
                {file.name}
                <Trash2 size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}

      {existingSubmission?.feedback && (
        <div className="mt-4 rounded-lg bg-white p-3 text-sm dark:bg-white/10">
          <p className="font-semibold text-[#135d54]">Teacher feedback</p>
          <p className="mt-1 leading-6 text-[#52645f] dark:text-white/70">{existingSubmission.feedback}</p>
        </div>
      )}

      {error && <p className="mt-4 rounded-lg bg-[#fff1ec] px-4 py-3 text-sm text-[#9d321f]">{error}</p>}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className={`inline-flex items-center justify-center gap-2 rounded-full border border-[#b7d5ce] bg-white px-4 py-2 text-sm font-semibold text-[#135d54] transition ${locked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-[#135d54]"}`}>
          <FileUp size={16} aria-hidden="true" />
          Upload files
          <input
            type="file"
            multiple
            disabled={locked}
            accept={acceptedFiles}
            className="sr-only"
            onChange={(event) => addFiles(event.target.files)}
          />
        </label>

        <button
          type="button"
          onClick={handleDraft}
          disabled={locked || submitting}
          className="rounded-full bg-[#eef7f4] px-4 py-2 text-sm font-semibold text-[#135d54] transition hover:bg-[#dbe7e2] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save draft
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={locked || submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#135d54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          Submit
        </button>
      </div>
    </div>
  );
}
