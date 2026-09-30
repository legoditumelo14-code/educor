import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Flame,
  GraduationCap,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react";
import BarChart from "../ui/BarChart";
import { auth } from "../../lib/firebase";
import { getProgressDashboard } from "../../lib/progress";
import type { ProgressActivity, ProgressDashboardData, WeeklyStudyPoint } from "../../types/progress";
import ProgressState from "./ProgressState";

interface ProgressDashboardModuleProps {
  role: "student" | "teacher" | null;
}

const skeletonCards = Array.from({ length: 6 }, (_, index) => index);

const activityIcon = (kind: ProgressActivity["kind"]) => {
  if (kind === "quiz") return Trophy;
  if (kind === "assignment") return CheckCircle2;
  if (kind === "certificate") return Award;
  if (kind === "course") return GraduationCap;
  return BookOpenCheck;
};

const formatDate = (millis: number) => {
  if (!millis) return "Recently";
  return new Date(millis).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function WeeklyStudyChart({ points }: { points: WeeklyStudyPoint[] }) {
  const maxMinutes = Math.max(...points.map((point) => point.minutes), 1);

  return (
    <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">Weekly study time</h3>
          <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Minutes estimated from learning activity.</p>
        </div>
        <CalendarDays className="text-[#135d54]" size={22} aria-hidden="true" />
      </div>

      <div className="mt-6 grid h-56 grid-cols-7 items-end gap-2">
        {points.map((point, index) => {
          const height = Math.max((point.minutes / maxMinutes) * 100, point.minutes > 0 ? 10 : 4);

          return (
            <div key={point.label} className="flex h-full flex-col items-center justify-end gap-2">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.7, delay: index * 0.07 }}
                className="w-full rounded-t-lg bg-[#135d54]"
              />
              <div className="text-center">
                <p className="text-xs font-bold text-[#17211f] dark:text-white">{point.minutes}</p>
                <p className="text-xs text-[#6c7d78] dark:text-white/55">{point.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ProgressDashboardModule({ role }: ProgressDashboardModuleProps) {
  const [data, setData] = useState<ProgressDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProgress = async () => {
    const user = auth.currentUser;
    setError("");
    setLoading(true);

    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setData(await getProgressDashboard(role === "teacher" ? "teacher" : "student", user.uid));
    } catch {
      setError("Progress data could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialProgress = async () => {
      const user = auth.currentUser;
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const progressData = await getProgressDashboard(role === "teacher" ? "teacher" : "student", user.uid);
        if (mounted) setData(progressData);
      } catch {
        if (mounted) setError("Progress data could not be loaded. Check your connection and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialProgress();

    return () => {
      mounted = false;
    };
  }, [role]);

  const earnedBadges = useMemo(
    () => data?.achievementBadges.filter((badge) => badge.earned).length ?? 0,
    [data]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="h-72 animate-pulse rounded-2xl border border-white/35 bg-[#135d54]/80 shadow-xl" />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
      <ProgressState
        icon={RefreshCw}
        title="Progress did not load"
        message={error}
        actionLabel="Try again"
        onAction={loadProgress}
      />
    );
  }

  if (!data) {
    return (
      <ProgressState
        icon={AlertCircle}
        title="No progress profile"
        message="Sign in again so Educor can connect your progress dashboard to your account."
      />
    );
  }

  const kpis = [
    {
      label: "Course completion",
      value: `${data.courseCompletionPercent}%`,
      helper: `${data.completedCourses}/${data.totalCourses} courses`,
      icon: GraduationCap,
    },
    {
      label: "Weekly study",
      value: `${data.weeklyStudyMinutes}m`,
      helper: "Last 7 days",
      icon: CalendarDays,
    },
    {
      label: "Learning streak",
      value: `${data.learningStreakDays}d`,
      helper: "Consecutive active days",
      icon: Flame,
    },
    {
      label: "Assignments",
      value: `${data.assignmentCompletionPercent}%`,
      helper: `${data.completedAssignments}/${data.totalAssignments} completed`,
      icon: CheckCircle2,
    },
    {
      label: "Quiz average",
      value: `${data.quizAveragePercent}%`,
      helper: `${data.quizAttempts} attempts`,
      icon: Trophy,
    },
    {
      label: "Badges earned",
      value: `${earnedBadges}/${data.achievementBadges.length}`,
      helper: "Achievement progress",
      icon: Award,
    },
  ];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#135d54] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(216,84,53,0.38),_transparent_34%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Progress Dashboard
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              {data.role === "teacher" ? "Class progress, momentum, and achievement at a glance." : "Your learning momentum, beautifully tracked."}
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              Educor turns completions, submissions, quiz scores, certificates, and lesson activity into a single progress workspace.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/15 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-white/60">Momentum score</p>
              <BarChart3 size={22} aria-hidden="true" />
            </div>
            <p className="mt-4 text-5xl font-bold">
              {Math.round(
                (data.courseCompletionPercent +
                  data.assignmentCompletionPercent +
                  data.quizAveragePercent +
                  Math.min(data.learningStreakDays * 10, 100)) /
                  4
              )}
            </p>
            <p className="mt-2 text-sm text-white/70">Based on completion, activity, and performance.</p>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((item, index) => {
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
              <p className="mt-3 text-sm text-[#6c7d78] dark:text-white/55">{item.helper}</p>
            </motion.article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <WeeklyStudyChart points={data.weeklyStudy} />
        <BarChart title="Completion mix" items={data.charts.completion} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1fr]">
        <BarChart title="Performance" items={data.charts.performance} />

        <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Achievement badges</h3>
              <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Milestones earned from progress activity.</p>
            </div>
            <Award className="text-[#135d54]" size={22} aria-hidden="true" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {data.achievementBadges.map((badge) => (
              <motion.div
                key={badge.id}
                whileHover={{ y: -3 }}
                className={`rounded-xl border p-4 ${
                  badge.earned
                    ? "border-[#b7d5ce] bg-[#eef7f4] text-[#135d54]"
                    : "border-[#dbe7e2] bg-white/70 text-[#52645f] dark:border-white/10 dark:bg-white/5 dark:text-white/65"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${badge.earned ? "bg-white" : "bg-[#eef7f4]"}`}>
                    <Award size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-bold">{badge.title}</p>
                    <p className="mt-1 text-xs">{badge.earned ? "Earned" : "In progress"}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6">{badge.description}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </section>

      <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">Recent activity</h3>
            <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Latest learning events from Firestore.</p>
          </div>
          <BookOpenCheck className="text-[#135d54]" size={22} aria-hidden="true" />
        </div>

        {data.activity.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-6 text-[#52645f] dark:border-white/15 dark:bg-white/5 dark:text-white/70">
            No recent learning activity yet.
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {data.activity.map((item, index) => {
              const Icon = activityIcon(item.kind);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex flex-col gap-3 rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef7f4] text-[#135d54]">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-bold">{item.title}</p>
                      <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">{item.detail}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-[#6c7d78] dark:text-white/55">{formatDate(item.occurredAtMs)}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
