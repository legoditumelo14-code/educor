import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Award, BarChart3, FileDown, GraduationCap, RefreshCw, SearchX, Sparkles } from "lucide-react";
import BarChart from "../ui/BarChart";
import { auth } from "../../lib/firebase";
import {
  createGradesCsv,
  createStudentReport,
  downloadTextFile,
  getStudentGradebook,
  getTeacherGradebook,
  summarizeGradebook,
  updateGradebookSubmission,
} from "../../lib/gradebook";
import type { GradeUpdateValues, GradebookFilters, GradebookRow } from "../../types/gradebook";
import GradebookFiltersBar from "./GradebookFilters";
import GradebookState from "./GradebookState";
import GradebookTable from "./GradebookTable";

interface GradebookModuleProps {
  role: "student" | "teacher" | null;
}

const defaultFilters: GradebookFilters = {
  search: "",
  status: "All",
  assignmentId: "All",
};

const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

export default function GradebookModule({ role }: GradebookModuleProps) {
  const [rows, setRows] = useState<GradebookRow[]>([]);
  const [filters, setFilters] = useState<GradebookFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");

  const canManage = role === "teacher";

  const loadGradebook = async () => {
    setError("");
    setLoading(true);

    try {
      if (canManage) {
        setRows(await getTeacherGradebook());
      } else {
        const user = auth.currentUser;
        if (!user) {
          setRows([]);
          return;
        }
        setRows(await getStudentGradebook(user.uid));
      }
    } catch {
      setError("Gradebook data could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialGradebook = async () => {
      try {
        const user = auth.currentUser;
        const data = role === "teacher" ? await getTeacherGradebook() : user ? await getStudentGradebook(user.uid) : [];
        if (mounted) setRows(data);
      } catch {
        if (mounted) setError("Gradebook data could not be loaded. Check your connection and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialGradebook();

    return () => {
      mounted = false;
    };
  }, [role]);

  const filteredRows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        [row.studentEmail, row.assignmentTitle, row.feedback, row.teacherComment, row.status]
          .join(" ")
          .toLowerCase()
          .includes(search);
      const matchesStatus = filters.status === "All" || row.status === filters.status;
      const matchesAssignment = filters.assignmentId === "All" || row.assignmentId === filters.assignmentId;

      return matchesSearch && matchesStatus && matchesAssignment;
    });
  }, [filters, rows]);

  const summary = useMemo(() => summarizeGradebook(rows), [rows]);
  const filteredSummary = useMemo(() => summarizeGradebook(filteredRows), [filteredRows]);

  const chartItems = [
    { label: "Average", value: filteredSummary.averagePercentage, tone: "green" as const },
    { label: "Highest", value: filteredSummary.highestPercentage, tone: "blue" as const },
    {
      label: "Graded",
      value: filteredSummary.totalRows
        ? Math.round((filteredSummary.gradedRows / filteredSummary.totalRows) * 100)
        : 0,
      tone: "orange" as const,
    },
  ];

  const workflowItems = [
    { label: "Submitted", value: filteredSummary.submittedRows, tone: "green" as const },
    { label: "Needs grading", value: filteredSummary.needsGrading, tone: "orange" as const },
    { label: "Graded", value: filteredSummary.gradedRows, tone: "blue" as const },
  ];

  const handleGrade = async (row: GradebookRow, values: GradeUpdateValues) => {
    setActionError("");
    setBusyId(row.id);

    try {
      await updateGradebookSubmission(row, values);
      await loadGradebook();
    } catch {
      setActionError("The grade could not be saved. Please try again.");
    } finally {
      setBusyId("");
    }
  };

  const exportGrades = () => {
    downloadTextFile("educor-gradebook.csv", createGradesCsv(filteredRows), "text/csv;charset=utf-8");
  };

  const downloadReport = () => {
    downloadTextFile("educor-grade-report.txt", createStudentReport(filteredRows, filteredSummary));
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#135d54] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(47,111,159,0.42),_transparent_34%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Gradebook
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              {canManage ? "Grade submissions and spot class trends." : "Track marks, feedback, and your average."}
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              Educor turns assignment results into a clear record of performance, feedback, and next actions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "Average", value: `${summary.averagePercentage}%` },
              { label: "Graded", value: `${summary.gradedRows}/${summary.totalRows}` },
              { label: canManage ? "Needs grading" : "Submitted", value: canManage ? summary.needsGrading : summary.submittedRows },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/20 bg-white/15 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/60">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <GradebookFiltersBar
          filters={filters}
          rows={rows}
          resultCount={filteredRows.length}
          onChange={setFilters}
        />

        <button
          type="button"
          onClick={canManage ? exportGrades : downloadReport}
          disabled={filteredRows.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileDown size={18} aria-hidden="true" />
          {canManage ? "Export grades" : "Download report"}
        </button>
      </div>

      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-[#9d321f]">
          <AlertCircle className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
          <p className="font-semibold">{actionError}</p>
        </div>
      )}

      {error && (
        <GradebookState
          icon={RefreshCw}
          title="Gradebook did not load"
          message={error}
          actionLabel="Try again"
          onAction={loadGradebook}
        />
      )}

      {loading && (
        <section className="rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <div className="space-y-3">
            {skeletonRows.map((row) => (
              <div key={row} className="grid animate-pulse gap-3 rounded-lg bg-[#eef7f4] p-4 md:grid-cols-5 dark:bg-white/10">
                <div className="h-5 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="h-5 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="h-5 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="h-5 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="h-5 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && rows.length === 0 && (
        <GradebookState
          icon={GraduationCap}
          title={canManage ? "No submissions to grade yet" : "No grades yet"}
          message={
            canManage
              ? "Student submissions will appear here once assignments are turned in."
              : "Your submitted and graded assignments will appear here with feedback and averages."
          }
        />
      )}

      {!loading && !error && rows.length > 0 && filteredRows.length === 0 && (
        <GradebookState
          icon={SearchX}
          title="No grade records match"
          message="Try a broader search, all statuses, or all assignments."
          actionLabel="Clear filters"
          onAction={() => setFilters(defaultFilters)}
        />
      )}

      {!loading && !error && filteredRows.length > 0 && (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Average", value: `${filteredSummary.averagePercentage}%`, icon: Award },
              { label: "Highest", value: `${filteredSummary.highestPercentage}%`, icon: BarChart3 },
              { label: canManage ? "Needs grading" : "Graded work", value: canManage ? filteredSummary.needsGrading : filteredSummary.gradedRows, icon: GraduationCap },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <motion.article
                  key={item.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#52645f] dark:text-white/65">{item.label}</p>
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef7f4] text-[#135d54]">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-bold">{item.value}</p>
                </motion.article>
              );
            })}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <BarChart title="Performance" items={chartItems} />
            <BarChart title="Workflow" items={workflowItems} valueSuffix="" />
          </section>

          <GradebookTable
            rows={filteredRows}
            canManage={canManage}
            busyId={busyId}
            onGrade={handleGrade}
            emptyState={
              <GradebookState
                icon={SearchX}
                title="No grade records match"
                message="Try a broader search, all statuses, or all assignments."
              />
            }
          />
        </>
      )}
    </div>
  );
}
