import { useCallback, useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  BrainCircuit,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  ListChecks,
  RefreshCw,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import clsx from "clsx";
import BarChart from "../ui/BarChart";
import { auth } from "../../lib/firebase";
import {
  createStudyTask,
  deleteStudyTask,
  getStudyTasks,
  summarizeStudyTasks,
  toggleStudyTask,
  updateStudyTask,
} from "../../lib/studyPlanner";
import type { StudyPlannerType, StudyTask, StudyTaskFormValues } from "../../types/studyPlanner";
import StudyPlannerState from "./StudyPlannerState";
import StudyTaskCard from "./StudyTaskCard";
import StudyTaskForm from "./StudyTaskForm";

type PlannerFilter = "all" | StudyPlannerType;

const plannerFilters: Array<{ value: PlannerFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "revision", label: "Revision" },
];

const skeletonCards = Array.from({ length: 4 }, (_, index) => index);

const aiPlaceholders = [
  {
    title: "Focus window",
    detail: "Coming soon",
    icon: Clock,
  },
  {
    title: "Revision priority",
    detail: "Coming soon",
    icon: Target,
  },
  {
    title: "Smart reorder",
    detail: "Coming soon",
    icon: BrainCircuit,
  },
];

const formatUpcomingDate = (date: string) => {
  if (!date) return "No date set";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const includesSearch = (task: StudyTask, searchTerm: string) => {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;

  return [task.title, task.subject, task.description, task.plannerType].some((value) =>
    value.toLowerCase().includes(term)
  );
};

export default function StudyPlannerModule() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [activeFilter, setActiveFilter] = useState<PlannerFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadTasks = useCallback(async () => {
    const user = auth.currentUser;
    setLoading(true);
    setError("");

    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setTasks(await getStudyTasks(user.uid));
    } catch {
      setError("Study planner tasks could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadInitialTasks = async () => {
      const user = auth.currentUser;
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const taskData = await getStudyTasks(user.uid);
        if (mounted) setTasks(taskData);
      } catch {
        if (mounted) setError("Study planner tasks could not be loaded. Check your connection and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialTasks();

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => summarizeStudyTasks(tasks), [tasks]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesPlanner = activeFilter === "all" || task.plannerType === activeFilter;
        return matchesPlanner && includesSearch(task, searchTerm);
      }),
    [activeFilter, searchTerm, tasks]
  );

  const nextTasks = useMemo(
    () =>
      tasks
        .filter((task) => !task.completed)
        .slice()
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
        .slice(0, 3),
    [tasks]
  );

  const completionPercent = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;

  const chartItems = useMemo(
    () => [
      { label: "Daily", value: tasks.filter((task) => task.plannerType === "daily").length, tone: "green" as const },
      { label: "Weekly", value: tasks.filter((task) => task.plannerType === "weekly").length, tone: "blue" as const },
      { label: "Revision", value: tasks.filter((task) => task.plannerType === "revision").length, tone: "orange" as const },
    ],
    [tasks]
  );

  const handleSubmit = async (values: StudyTaskFormValues) => {
    const user = auth.currentUser;
    setActionError("");

    if (!user) {
      setActionError("Sign in again before saving planner tasks.");
      return;
    }

    try {
      setSubmitting(true);

      if (editingTask) {
        await updateStudyTask(editingTask, values);
      } else {
        await createStudyTask(user.uid, values);
      }

      setEditingTask(null);
      setActiveFilter(values.plannerType);
      await loadTasks();
    } catch {
      setActionError("Planner task could not be saved. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (task: StudyTask) => {
    setActionError("");
    setBusyTaskId(task.id);

    try {
      await toggleStudyTask(task);
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, completed: !item.completed, updatedAtMs: Date.now() } : item
        )
      );
    } catch {
      setActionError("Task status could not be updated.");
    } finally {
      setBusyTaskId("");
    }
  };

  const handleDelete = async (task: StudyTask) => {
    setActionError("");
    setBusyTaskId(task.id);

    try {
      await deleteStudyTask(task);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      if (editingTask?.id === task.id) setEditingTask(null);
    } catch {
      setActionError("Task could not be deleted.");
    } finally {
      setBusyTaskId("");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="h-72 animate-pulse rounded-2xl border border-white/35 bg-[#135d54]/80 shadow-xl" />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {skeletonCards.map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-xl border border-white/45 bg-white/60 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
            />
          ))}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <StudyPlannerState
        icon={RefreshCw}
        title="Study planner did not load"
        message={error}
        actionLabel="Try again"
        onAction={loadTasks}
      />
    );
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#135d54] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(47,111,159,0.38),_transparent_34%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Study Planner
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              Daily study blocks, weekly planning, and revision in one calm workspace.
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              Plan tasks, set reminders, track checklist progress, and send study blocks to your calendar.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/15 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-white/60">Task completion</p>
              <CheckCircle2 size={22} aria-hidden="true" />
            </div>
            <p className="mt-4 text-5xl font-bold">{completionPercent}%</p>
            <p className="mt-2 text-sm text-white/70">
              {summary.completed}/{summary.total} study tasks complete
            </p>
          </div>
        </div>
      </motion.section>

      {actionError && (
        <section className="flex items-start gap-3 rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-[#9d321f]">
          <AlertCircle className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
          <p className="font-semibold">{actionError}</p>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total tasks", value: summary.total, icon: ListChecks },
          { label: "Pending", value: summary.pending, icon: Clock },
          { label: "High priority", value: summary.highPriority, icon: Target },
          { label: "Reminders", value: summary.reminderCount, icon: Bell },
        ].map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.article
              key={item.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#52645f] dark:text-white/65">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold">{item.value}</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
                  <Icon size={22} aria-hidden="true" />
                </span>
              </div>
            </motion.article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-4">
          <section className="grid gap-3 rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl md:grid-cols-[1fr_260px] md:items-center dark:border-white/10 dark:bg-white/10">
            <div className="flex flex-wrap gap-2">
              {plannerFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={clsx(
                    "rounded-full px-4 py-2 text-sm font-bold transition",
                    activeFilter === filter.value
                      ? "bg-[#135d54] text-white"
                      : "bg-[#eef7f4] text-[#52645f] hover:text-[#135d54] dark:bg-white/10 dark:text-white/70"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <label className="relative">
              <span className="sr-only">Search study tasks</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7d78]"
                size={17}
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search planner"
                className="w-full rounded-full border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
              />
            </label>
          </section>

          {filteredTasks.length === 0 ? (
            <StudyPlannerState
              icon={CalendarCheck}
              title="No study tasks here yet"
              message="Create a study block or adjust the planner filters to see more tasks."
            />
          ) : (
            <div className="grid gap-4">
              {filteredTasks.map((task) => (
                <StudyTaskCard
                  key={task.id}
                  task={task}
                  busy={busyTaskId === task.id || submitting}
                  onToggle={handleToggle}
                  onEdit={setEditingTask}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <StudyTaskForm
            key={editingTask?.id ?? "new-study-task"}
            initialTask={editingTask}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={editingTask ? () => setEditingTask(null) : undefined}
          />

          <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Upcoming</h2>
                <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Next open study blocks.</p>
              </div>
              <CalendarDays className="text-[#135d54]" size={22} aria-hidden="true" />
            </div>

            {nextTasks.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-4 text-sm font-semibold text-[#52645f] dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                No pending study blocks.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {nextTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{task.title}</p>
                        <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">{task.subject}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#135d54]">
                        {formatUpcomingDate(task.date)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[#6c7d78] dark:text-white/55">
                      {task.startTime} - {task.endTime}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">AI recommendations</h2>
                <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Future planning signals.</p>
              </div>
              <BrainCircuit className="text-[#2f6f9f]" size={22} aria-hidden="true" />
            </div>

            <div className="mt-5 grid gap-3">
              {aiPlaceholders.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#edf5fb] text-[#2f6f9f]">
                        <Icon size={19} aria-hidden="true" />
                      </span>
                      <p className="font-bold">{item.title}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#6c7d78]">
                      {item.detail}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <BarChart title="Planner mix" items={chartItems} valueSuffix="" />
        </aside>
      </section>
    </div>
  );
}
