import { useState, type ReactNode } from "react";
import { Check, Edit3, Save, X } from "lucide-react";
import DataTable, { type DataTableColumn } from "../ui/DataTable";
import type { GradeUpdateValues, GradebookRow } from "../../types/gradebook";

interface GradebookTableProps {
  rows: GradebookRow[];
  canManage: boolean;
  busyId: string;
  onGrade: (row: GradebookRow, values: GradeUpdateValues) => Promise<void>;
  emptyState: ReactNode;
}

const formatDate = (dateValue: string | number) => {
  if (!dateValue) return "Not recorded";
  const date = typeof dateValue === "number" ? new Date(dateValue) : new Date(`${dateValue}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return String(dateValue);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const statusClass = (status: GradebookRow["status"]) => {
  if (status === "graded") return "bg-[#e5f2ef] text-[#135d54]";
  if (status === "late") return "bg-[#fff1ec] text-[#9d321f]";
  if (status === "submitted") return "bg-[#eef7f4] text-[#135d54]";
  return "bg-white text-[#52645f] shadow-sm dark:bg-white/10 dark:text-white/70";
};

export default function GradebookTable({ rows, canManage, busyId, onGrade, emptyState }: GradebookTableProps) {
  const [editingId, setEditingId] = useState("");
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [teacherComment, setTeacherComment] = useState("");
  const [error, setError] = useState("");

  const startEditing = (row: GradebookRow) => {
    setEditingId(row.id);
    setMarks(row.marksAwarded === null ? "" : String(row.marksAwarded));
    setFeedback(row.feedback);
    setTeacherComment(row.teacherComment);
    setError("");
  };

  const cancelEditing = () => {
    setEditingId("");
    setMarks("");
    setFeedback("");
    setTeacherComment("");
    setError("");
  };

  const saveGrade = async (row: GradebookRow) => {
    const numericMarks = Number(marks);

    if (!Number.isFinite(numericMarks) || numericMarks < 0 || numericMarks > row.maxMarks) {
      setError(`Marks must be between 0 and ${row.maxMarks}.`);
      return;
    }

    await onGrade(row, {
      marksAwarded: numericMarks,
      feedback,
      teacherComment,
    });
    cancelEditing();
  };

  const columns: Array<DataTableColumn<GradebookRow>> = (() => {
    const baseColumns: Array<DataTableColumn<GradebookRow>> = [
      {
        key: "student",
        header: "Student",
        render: (row) => (
          <div>
            <p className="font-bold text-[#17211f] dark:text-white">{row.studentEmail}</p>
            <p className="mt-1 text-xs text-[#6c7d78] dark:text-white/55">{row.studentId || "Student profile"}</p>
          </div>
        ),
      },
      {
        key: "assignment",
        header: "Assignment",
        render: (row) => (
          <div>
            <p className="font-semibold text-[#17211f] dark:text-white">{row.assignmentTitle}</p>
            <p className="mt-1 text-xs text-[#6c7d78] dark:text-white/55">Due {formatDate(row.dueDate)}</p>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClass(row.status)}`}>
            {row.status.replace("_", " ")}
          </span>
        ),
      },
      {
        key: "grade",
        header: "Grade",
        render: (row) =>
          editingId === row.id ? (
            <input
              type="number"
              min={0}
              max={row.maxMarks}
              value={marks}
              onChange={(event) => setMarks(event.target.value)}
              className="w-28 rounded-lg border border-[#c9ded8] bg-white px-3 py-2 text-[#17211f] outline-none focus:border-[#135d54]"
            />
          ) : (
            <div>
              <p className="font-bold text-[#17211f] dark:text-white">
                {row.marksAwarded === null ? "Not graded" : `${row.marksAwarded}/${row.maxMarks}`}
              </p>
              <p className="mt-1 text-xs text-[#6c7d78] dark:text-white/55">
                {row.percentage === null ? "No average yet" : `${row.percentage}%`}
              </p>
            </div>
          ),
      },
      {
        key: "feedback",
        header: "Feedback",
        className: "min-w-72",
        render: (row) =>
          editingId === row.id ? (
            <div className="grid gap-2">
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Student-facing feedback"
                className="min-h-20 rounded-lg border border-[#c9ded8] bg-white px-3 py-2 text-[#17211f] outline-none focus:border-[#135d54]"
              />
              <input
                value={teacherComment}
                onChange={(event) => setTeacherComment(event.target.value)}
                placeholder="Teacher comment"
                className="rounded-lg border border-[#c9ded8] bg-white px-3 py-2 text-[#17211f] outline-none focus:border-[#135d54]"
              />
              {error && <p className="rounded-lg bg-[#fff1ec] px-3 py-2 text-xs font-semibold text-[#9d321f]">{error}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="leading-6 text-[#52645f] dark:text-white/70">{row.feedback || "No feedback yet."}</p>
              {canManage && row.teacherComment && (
                <p className="rounded-lg bg-[#eef7f4] px-3 py-2 text-xs font-semibold text-[#135d54]">
                  {row.teacherComment}
                </p>
              )}
            </div>
          ),
      },
    ];

    if (!canManage) return baseColumns.filter((column) => column.key !== "student");

    return [
      ...baseColumns,
      {
        key: "actions",
        header: "Actions",
        render: (row) =>
          editingId === row.id ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveGrade(row)}
                disabled={busyId === row.id}
                className="inline-flex items-center gap-2 rounded-full bg-[#135d54] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                <Save size={14} aria-hidden="true" />
                Save
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="inline-flex items-center gap-2 rounded-full bg-[#eef7f4] px-3 py-2 text-xs font-bold text-[#52645f]"
              >
                <X size={14} aria-hidden="true" />
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => startEditing(row)}
              disabled={Boolean(busyId)}
              className="inline-flex items-center gap-2 rounded-full bg-[#ffe8dd] px-3 py-2 text-xs font-bold text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:opacity-60"
            >
              {row.marksAwarded === null ? <Edit3 size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
              {row.marksAwarded === null ? "Grade" : "Update"}
            </button>
          ),
      },
    ];
  })();

  return <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} emptyState={emptyState} />;
}
