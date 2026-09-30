import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  getAllAssignmentSubmissions,
  getAssignments,
  getSubmissionsForStudent,
} from "./assignments";
import type { Assignment, AssignmentSubmission } from "../types/assignment";
import type { GradeUpdateValues, GradebookRow, GradebookSummary } from "../types/gradebook";

const percent = (marksAwarded: number | null, maxMarks: number) => {
  if (marksAwarded === null || maxMarks <= 0) return null;
  return Math.round((marksAwarded / maxMarks) * 100);
};

const formatDate = (millis: number) => {
  if (!millis) return "Not recorded";
  return new Date(millis).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const toGradebookRow = (
  submission: AssignmentSubmission,
  assignmentMap: Map<string, Assignment>
): GradebookRow => {
  const assignment = assignmentMap.get(submission.assignmentId);
  const maxMarks = assignment?.maxMarks ?? 100;

  return {
    id: submission.id,
    assignmentId: submission.assignmentId,
    assignmentTitle: assignment?.title ?? "Deleted assignment",
    dueDate: assignment?.dueDate ?? "",
    maxMarks,
    studentId: submission.studentId,
    studentEmail: submission.studentEmail,
    status: submission.status,
    submittedAtMs: submission.submittedAtMs,
    updatedAtMs: submission.updatedAtMs,
    marksAwarded: submission.marksAwarded,
    feedback: submission.feedback,
    teacherComment: submission.teacherComment,
    percentage: percent(submission.marksAwarded, maxMarks),
  };
};

export const buildGradebookRows = (
  assignments: Assignment[],
  submissions: AssignmentSubmission[]
): GradebookRow[] => {
  const assignmentMap = new Map(assignments.map((assignment) => [assignment.id, assignment]));

  return submissions
    .map((submission) => toGradebookRow(submission, assignmentMap))
    .sort((a, b) => {
      if (a.studentEmail !== b.studentEmail) return a.studentEmail.localeCompare(b.studentEmail);
      return a.assignmentTitle.localeCompare(b.assignmentTitle);
    });
};

export const getTeacherGradebook = async (): Promise<GradebookRow[]> => {
  const [assignments, submissions] = await Promise.all([getAssignments(), getAllAssignmentSubmissions()]);
  return buildGradebookRows(assignments, submissions);
};

export const getStudentGradebook = async (studentId: string): Promise<GradebookRow[]> => {
  const assignments = await getAssignments();
  const submissionsByAssignment = await getSubmissionsForStudent(studentId);
  return buildGradebookRows(assignments, Object.values(submissionsByAssignment));
};

export const summarizeGradebook = (rows: GradebookRow[]): GradebookSummary => {
  const gradedRows = rows.filter((row) => row.marksAwarded !== null);
  const percentages = gradedRows
    .map((row) => row.percentage)
    .filter((value): value is number => value !== null);
  const averagePercentage =
    percentages.length === 0
      ? 0
      : Math.round(percentages.reduce((total, value) => total + value, 0) / percentages.length);

  return {
    totalRows: rows.length,
    gradedRows: gradedRows.length,
    submittedRows: rows.filter((row) => ["submitted", "late", "graded"].includes(row.status)).length,
    averagePercentage,
    highestPercentage: percentages.length ? Math.max(...percentages) : 0,
    needsGrading: rows.filter((row) => row.status !== "draft" && row.marksAwarded === null).length,
  };
};

export const updateGradebookSubmission = async (row: GradebookRow, values: GradeUpdateValues) => {
  await updateDoc(doc(db, "assignmentSubmissions", row.id), {
    marksAwarded: values.marksAwarded,
    feedback: values.feedback.trim(),
    teacherComment: values.teacherComment.trim(),
    status: "graded",
    updatedAt: serverTimestamp(),
  });
};

const csvCell = (value: string | number | null) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export const createGradesCsv = (rows: GradebookRow[]) => {
  const header = [
    "Student",
    "Assignment",
    "Status",
    "Marks",
    "Max marks",
    "Percentage",
    "Feedback",
    "Teacher comment",
    "Submitted",
  ];

  const lines = rows.map((row) =>
    [
      row.studentEmail,
      row.assignmentTitle,
      row.status,
      row.marksAwarded,
      row.maxMarks,
      row.percentage === null ? "" : `${row.percentage}%`,
      row.feedback,
      row.teacherComment,
      formatDate(row.submittedAtMs),
    ]
      .map(csvCell)
      .join(",")
  );

  return [header.map(csvCell).join(","), ...lines].join("\n");
};

export const createStudentReport = (rows: GradebookRow[], summary: GradebookSummary) => {
  const lines = rows.map((row) => {
    const grade = row.marksAwarded === null ? "Not graded" : `${row.marksAwarded}/${row.maxMarks} (${row.percentage}%)`;
    const feedback = row.feedback ? ` Feedback: ${row.feedback}` : "";
    return `- ${row.assignmentTitle}: ${grade}.${feedback}`;
  });

  return [
    "Educor Grade Report",
    `Average: ${summary.averagePercentage}%`,
    `Graded work: ${summary.gradedRows}/${summary.totalRows}`,
    "",
    ...lines,
  ].join("\n");
};

export const downloadTextFile = (filename: string, content: string, type = "text/plain;charset=utf-8") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
