import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ClipboardCheck, ClipboardList, RefreshCw, Sparkles } from "lucide-react";
import { auth } from "../../lib/firebase";
import {
  createAssignment,
  deleteAssignment,
  getAllAssignmentSubmissions,
  getAssignments,
  getSubmissionsForStudent,
  gradeSubmission,
  isAssignmentPastDue,
  saveSubmissionDraft,
  submitAssignment,
  updateAssignment,
} from "../../lib/assignments";
import type {
  Assignment,
  AssignmentFormValues,
  AssignmentSubmission,
  SubmissionFormValues,
} from "../../types/assignment";
import AssignmentCard from "./AssignmentCard";
import AssignmentForm from "./AssignmentForm";
import AssignmentState from "./AssignmentState";

interface AssignmentManagementModuleProps {
  role: "student" | "teacher" | null;
  onAssignmentsLoaded?: (count: number) => void;
}

const skeletonCards = Array.from({ length: 6 }, (_, index) => index);

export default function AssignmentManagementModule({ role, onAssignmentsLoaded }: AssignmentManagementModuleProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, AssignmentSubmission>>({});
  const [allSubmissions, setAllSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  const canManage = role === "teacher";

  const submissionsByAssignment = useMemo(
    () =>
      allSubmissions.reduce<Record<string, AssignmentSubmission[]>>((submissionMap, submission) => {
        if (!submission.assignmentId) return submissionMap;
        submissionMap[submission.assignmentId] = [...(submissionMap[submission.assignmentId] ?? []), submission];
        return submissionMap;
      }, {}),
    [allSubmissions]
  );

  const openCount = useMemo(
    () => assignments.filter((assignment) => !isAssignmentPastDue(assignment.dueDate)).length,
    [assignments]
  );

  const submittedCount = useMemo(() => {
    if (canManage) {
      return allSubmissions.filter((submission) => ["submitted", "late", "graded"].includes(submission.status)).length;
    }

    return Object.values(studentSubmissions).filter((submission) =>
      ["submitted", "late", "graded"].includes(submission.status)
    ).length;
  }, [allSubmissions, canManage, studentSubmissions]);

  const gradedCount = useMemo(
    () => allSubmissions.filter((submission) => submission.status === "graded").length,
    [allSubmissions]
  );

  const loadAssignments = async () => {
    setError("");
    setLoading(true);

    try {
      const assignmentData = await getAssignments();
      setAssignments(assignmentData);
      onAssignmentsLoaded?.(assignmentData.length);

      const user = auth.currentUser;
      if (canManage) {
        setAllSubmissions(await getAllAssignmentSubmissions());
      } else if (user) {
        setStudentSubmissions(await getSubmissionsForStudent(user.uid));
      }
    } catch {
      setError("Assignments could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialAssignments = async () => {
      try {
        const assignmentData = await getAssignments();
        if (!mounted) return;

        setAssignments(assignmentData);
        onAssignmentsLoaded?.(assignmentData.length);

        const user = auth.currentUser;
        if (role === "teacher") {
          const submissionData = await getAllAssignmentSubmissions();
          if (mounted) setAllSubmissions(submissionData);
        } else if (user) {
          const submissionData = await getSubmissionsForStudent(user.uid);
          if (mounted) setStudentSubmissions(submissionData);
        }
      } catch {
        if (mounted) setError("Assignments could not be loaded. Check your connection and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialAssignments();

    return () => {
      mounted = false;
    };
  }, [onAssignmentsLoaded, role]);

  const refreshAssignments = async () => {
    const assignmentData = await getAssignments();
    setAssignments(assignmentData);
    onAssignmentsLoaded?.(assignmentData.length);
    return assignmentData;
  };

  const refreshSubmissions = async () => {
    const user = auth.currentUser;

    if (canManage) {
      setAllSubmissions(await getAllAssignmentSubmissions());
    } else if (user) {
      setStudentSubmissions(await getSubmissionsForStudent(user.uid));
    }
  };

  const handleCreate = async (values: AssignmentFormValues) => {
    const user = auth.currentUser;
    setActionError("");

    if (!user || !canManage) {
      setActionError("Only logged-in teachers can create assignments.");
      return;
    }

    setSubmitting(true);
    try {
      await createAssignment(values, {
        uid: user.uid,
        email: user.email || "Educor teacher",
      });
      await refreshAssignments();
    } catch {
      setActionError("The assignment could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (values: AssignmentFormValues) => {
    if (!editingAssignment) return;
    setActionError("");
    setSubmitting(true);

    try {
      await updateAssignment(editingAssignment, values);
      await refreshAssignments();
      setEditingAssignment(null);
    } catch {
      setActionError("The assignment could not be updated. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (assignment: Assignment) => {
    if (!window.confirm(`Delete "${assignment.title}" and all related submissions?`)) return;

    setActionError("");
    setBusyId(assignment.id);

    try {
      await deleteAssignment(assignment);
      await refreshAssignments();
      await refreshSubmissions();
      if (editingAssignment?.id === assignment.id) setEditingAssignment(null);
    } catch {
      setActionError("The assignment could not be deleted. Please try again.");
    } finally {
      setBusyId("");
    }
  };

  const handleSaveDraft = async (
    assignment: Assignment,
    values: SubmissionFormValues,
    existing?: AssignmentSubmission
  ) => {
    const user = auth.currentUser;
    if (!user) return;

    setActionError("");
    setBusyId(assignment.id);

    try {
      await saveSubmissionDraft(
        assignment,
        values,
        {
          uid: user.uid,
          email: user.email || "Educor student",
        },
        existing
      );
      await refreshSubmissions();
    } catch {
      setActionError("The draft could not be saved. The deadline may have passed.");
    } finally {
      setBusyId("");
    }
  };

  const handleSubmit = async (assignment: Assignment, values: SubmissionFormValues, existing?: AssignmentSubmission) => {
    const user = auth.currentUser;
    if (!user) return;

    setActionError("");
    setBusyId(assignment.id);

    try {
      await submitAssignment(
        assignment,
        values,
        {
          uid: user.uid,
          email: user.email || "Educor student",
        },
        existing
      );
      await refreshSubmissions();
    } catch {
      setActionError("The submission could not be uploaded. Please try again.");
    } finally {
      setBusyId("");
    }
  };

  const handleGrade = async (submission: AssignmentSubmission, marksAwarded: number, feedback: string) => {
    setActionError("");
    setBusyId(submission.assignmentId);

    try {
      await gradeSubmission(submission, marksAwarded, feedback);
      await refreshSubmissions();
    } catch {
      setActionError("Marks could not be saved. Please try again.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#135d54] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(216,84,53,0.42),_transparent_34%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Assignment Management
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              {canManage ? "Create work, collect submissions, and assign marks." : "Track work, submit files, and see your status."}
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              A complete assignment workflow for due dates, instructions, file attachments, submissions, editable drafts, status tracking, and marks.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "Assignments", value: assignments.length },
              { label: "Open", value: openCount },
              { label: canManage ? "Marked" : "Submitted", value: canManage ? gradedCount : submittedCount },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/20 bg-white/15 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/60">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {canManage && (
        <AssignmentForm
          key={editingAssignment?.id ?? "new-assignment"}
          initialAssignment={editingAssignment}
          submitting={submitting}
          onSubmit={editingAssignment ? handleUpdate : handleCreate}
          onCancel={editingAssignment ? () => setEditingAssignment(null) : undefined}
        />
      )}

      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-[#9d321f]">
          <AlertCircle className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
          <p className="font-semibold">{actionError}</p>
        </div>
      )}

      {error && (
        <AssignmentState
          icon={RefreshCw}
          title="Assignments did not load"
          message={error}
          actionLabel="Try again"
          onAction={loadAssignments}
        />
      )}

      {loading && (
        <section className="grid gap-4 xl:grid-cols-2">
          {skeletonCards.map((item) => (
            <div
              key={item}
              className="h-80 animate-pulse rounded-2xl border border-white/45 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
            >
              <div className="h-7 w-32 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
              <div className="mt-5 h-8 w-3/4 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
              <div className="mt-4 h-4 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
              <div className="mt-3 h-4 w-5/6 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
              <div className="mt-8 h-24 rounded-xl bg-[#dbe7e2] dark:bg-white/10" />
            </div>
          ))}
        </section>
      )}

      {!loading && !error && assignments.length === 0 && (
        <AssignmentState
          icon={ClipboardList}
          title={canManage ? "Create the first assignment" : "No assignments yet"}
          message={
            canManage
              ? "Use the manager above to set instructions, marks, a due date, and any files students need."
              : "Teachers have not created assignments yet. Once they do, you will be able to submit work here."
          }
        />
      )}

      {!loading && !error && assignments.length > 0 && (
        <motion.section layout className="grid gap-4 xl:grid-cols-2">
          <AnimatePresence>
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                canManage={canManage}
                submission={studentSubmissions[assignment.id]}
                submissions={submissionsByAssignment[assignment.id] ?? []}
                busy={busyId === assignment.id || submitting}
                onEdit={setEditingAssignment}
                onDelete={handleDelete}
                onSaveDraft={handleSaveDraft}
                onSubmit={handleSubmit}
                onGrade={handleGrade}
              />
            ))}
          </AnimatePresence>
        </motion.section>
      )}

      {!loading && !error && assignments.length > 0 && (
        <section className="rounded-xl border border-white/45 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
              <ClipboardCheck size={22} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold">Submission loop</h3>
              <p className="mt-1 leading-7 text-[#52645f] dark:text-white/70">
                Clear instructions, editable submissions before deadline, visible statuses, and marks close the loop between teacher expectations and student work.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
