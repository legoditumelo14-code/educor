import { useState, type FormEvent } from "react";
import { MessageCirclePlus, Send, Users } from "lucide-react";
import type { ConversationDraft, MessageAuthor } from "../../types/messaging";

interface ConversationStarterProps {
  role: MessageAuthor["role"];
  submitting: boolean;
  onSubmit: (draft: ConversationDraft) => Promise<void>;
}

const teacherTargets: Array<{ value: ConversationDraft["targetRole"]; label: string }> = [
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
  { value: "admin", label: "Admin" },
];

const studentTargets: Array<{ value: ConversationDraft["targetRole"]; label: string }> = [
  { value: "teacher", label: "Teacher" },
];

const defaultDraft = (role: MessageAuthor["role"]): ConversationDraft => ({
  targetEmail: "",
  targetRole: role === "teacher" ? "student" : "teacher",
  subject: "",
});

export default function ConversationStarter({ role, submitting, onSubmit }: ConversationStarterProps) {
  const [draft, setDraft] = useState<ConversationDraft>(() => defaultDraft(role));
  const [validationError, setValidationError] = useState("");
  const targetOptions = role === "teacher" ? teacherTargets : studentTargets;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (!draft.targetEmail.trim()) {
      setValidationError("Add the recipient email.");
      return;
    }

    await onSubmit(draft);
    setDraft(defaultDraft(role));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[#d85435]">New conversation</p>
          <h2 className="mt-1 text-xl font-bold">Start a secure chat</h2>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
          <MessageCirclePlus size={22} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        <label>
          <span className="flex items-center gap-2 text-sm font-semibold text-[#52645f] dark:text-white/70">
            <Users size={16} aria-hidden="true" />
            Recipient type
          </span>
          <select
            value={draft.targetRole}
            onChange={(event) =>
              setDraft((current) => ({ ...current, targetRole: event.target.value as ConversationDraft["targetRole"] }))
            }
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          >
            {targetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Recipient email</span>
          <input
            type="email"
            value={draft.targetEmail}
            onChange={(event) => setDraft((current) => ({ ...current, targetEmail: event.target.value }))}
            placeholder="recipient@example.com"
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-[#52645f] dark:text-white/70">Subject</span>
          <input
            type="text"
            value={draft.subject}
            onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
            placeholder="Attendance follow-up"
            className="mt-2 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>
      </div>

      {validationError && (
        <p className="mt-4 rounded-lg bg-[#fff1ec] px-4 py-3 text-sm font-semibold text-[#9d321f]">
          {validationError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send size={17} aria-hidden="true" />
        {submitting ? "Opening..." : "Open conversation"}
      </button>
    </form>
  );
}
