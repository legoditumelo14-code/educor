import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, Edit3, FileCheck2, Trash2 } from "lucide-react";
import type { Assignment, AssignmentSubmission, SubmissionFormValues } from "../../types/assignment";
import { isAssignmentPastDue } from "../../lib/assignments";
import AssignmentResourceList from "./AssignmentResourceList";
import SubmissionForm from "./SubmissionForm";

interface AssignmentCardProps {
  assignment: Assignment;
  canManage: boolean;
  submission?: AssignmentSubmission;
  submissions: AssignmentSubmission[];
  busy: boolean;
  onEdit: (assignment: Assignment) => void;
  onDelete: (assignment: Assignment) => void;
  onSaveDraft: (assignment: Assignment, values: SubmissionFormValues, existing?: AssignmentSubmission) => Promise<void>;
  onSubmit: (assignment: Assignment, values: SubmissionFormValues, existing?: AssignmentSubmission) => Promise<void>;
  onGrade: (submission: AssignmentSubmission, marksAwarded: number, feedback: string) => Promise<void>;
}

const statusLabel = (submission?: AssignmentSubmission) => {
  if (!submission) return "Not submitted";
  if (submission.status === "not_submitted") return "Not submitted";
  return submission.status.replace("_", " ");
};

const dueLabel = (dueDate: string) => {
  if (!dueDate) return "No due date";
  const date = new Date(`${dueDate}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return dueDate;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function AssignmentCard({
  assignment,
  canManage,
  submission,
  submissions,
  busy,
  onEdit,
  onDelete,
  onSaveDraft,
  onSubmit,
  onGrade,
}: AssignmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [gradingId, setGradingId] = useState("");
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const pastDue = isAssignmentPastDue(assignment.dueDate);
  const locked = pastDue && Boolean(submission);

  const submitGrade = async (targetSubmission: AssignmentSubmission) => {
    const numericMarks = Number(marks);
    if (!Number.isFinite(numericMarks) || numericMarks < 0 || numericMarks > assignment.maxMarks) return;

    await onGrade(targetSubmission, numericMarks, feedback);
    setGradingId("");
    setMarks("");
    setFeedback("");
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl transition hover:shadow-xl dark:border-white/10 dark:bg-white/10"
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${pastDue ? "bg-[#fff1ec] text-[#9d321f]" : "bg-[#e5f2ef] text-[#135d54]"}`}>
              {pastDue ? "Past due" : "Open"}
            </span>
            {!canManage && (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-[#52645f] shadow-sm dark:bg-white/10 dark:text-white/70">
                {statusLabel(submission)}
              </span>
            )}
          </div>
          <h3 className="mt-4 text-xl font-bold tracking-normal">{assignment.title}</h3>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-[#52645f] dark:text-white/70">{assignment.instructions}</p>
        </div>

        <div className="grid min-w-40 gap-2 rounded-xl bg-[#eef7f4] p-4 text-[#135d54] dark:bg-white/10 dark:text-white">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock size={16} aria-hidden="true" />
            {dueLabel(assignment.dueDate)}
          </span>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <FileCheck2 size={16} aria-hidden="true" />
            {assignment.maxMarks} marks
          </span>
        </div>
      </div>

      <AssignmentResourceList resources={assignment.resources} />

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-full bg-[#135d54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f4942]"
        >
          {expanded ? "Hide details" : canManage ? "View submissions" : "Open assignment"}
        </button>

        {canManage && (
          <>
            <button
              type="button"
              onClick={() => onEdit(assignment)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-[#ffe8dd] px-4 py-2 text-sm font-semibold text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:opacity-60"
            >
              <Edit3 size={16} aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(assignment)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-[#fff1ec] px-4 py-2 text-sm font-semibold text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:opacity-60"
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </button>
          </>
        )}
      </div>

      {expanded && !canManage && (
        <div className="mt-5">
          {submission?.marksAwarded !== null && submission?.marksAwarded !== undefined && (
            <div className="mb-4 rounded-xl bg-[#e5f2ef] p-4 text-[#135d54]">
              <p className="font-bold">Marked: {submission.marksAwarded}/{assignment.maxMarks}</p>
              {submission.feedback && <p className="mt-1 leading-6">{submission.feedback}</p>}
            </div>
          )}
          <SubmissionForm
            key={submission?.id ?? assignment.id}
            existingSubmission={submission}
            locked={locked}
            submitting={busy}
            onSaveDraft={(values) => onSaveDraft(assignment, values, submission)}
            onSubmit={(values) => onSubmit(assignment, values, submission)}
          />
        </div>
      )}

      {expanded && canManage && (
        <div className="mt-5 space-y-3">
          {submissions.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-5 text-[#52645f] dark:border-white/15 dark:bg-white/5 dark:text-white/70">
              No submissions yet.
            </div>
          )}

          {submissions.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-semibold text-[#135d54]">{item.studentEmail}</p>
                  <p className="mt-1 text-xs font-bold uppercase text-[#6c7d78] dark:text-white/55">{item.status}</p>
                </div>
                {item.marksAwarded !== null ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#e5f2ef] px-3 py-1 text-sm font-bold text-[#135d54]">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    {item.marksAwarded}/{assignment.maxMarks}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setGradingId(item.id);
                      setMarks("");
                      setFeedback("");
                    }}
                    className="rounded-full bg-[#135d54] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Assign marks
                  </button>
                )}
              </div>

              {item.note && <p className="mt-3 whitespace-pre-wrap leading-7 text-[#52645f] dark:text-white/70">{item.note}</p>}
              <AssignmentResourceList resources={item.resources} />

              {gradingId === item.id && (
                <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_auto]">
                  <input
                    type="number"
                    min={0}
                    max={assignment.maxMarks}
                    value={marks}
                    onChange={(event) => setMarks(event.target.value)}
                    placeholder={`0-${assignment.maxMarks}`}
                    className="rounded-lg border border-[#c9ded8] bg-white px-4 py-3 text-[#17211f] outline-none focus:border-[#135d54]"
                  />
                  <input
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="Feedback"
                    className="rounded-lg border border-[#c9ded8] bg-white px-4 py-3 text-[#17211f] outline-none focus:border-[#135d54]"
                  />
                  <button
                    type="button"
                    onClick={() => submitGrade(item)}
                    disabled={busy}
                    className="rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.article>
  );
}
