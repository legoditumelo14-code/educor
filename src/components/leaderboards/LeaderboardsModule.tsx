import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, BarChart3, Crown, Filter, Medal, RefreshCw, Sparkles, Trophy } from "lucide-react";
import BarChart from "../ui/BarChart";
import DataTable, { type DataTableColumn } from "../ui/DataTable";
import { auth } from "../../lib/firebase";
import { getAchievementDashboard } from "../../lib/achievements";
import { getLeaderboardDashboard } from "../../lib/leaderboards";
import type { LeaderboardDashboardData, LeaderboardFilters, LeaderboardRow } from "../../types/leaderboard";
import LeaderboardState from "./LeaderboardState";

interface LeaderboardsModuleProps {
  role: "student" | "teacher" | null;
}

const defaultFilters: LeaderboardFilters = {
  scope: "school",
  period: "weekly",
};

const skeletonCards = Array.from({ length: 4 }, (_, index) => index);

const columns: Array<DataTableColumn<LeaderboardRow>> = [
  {
    key: "rank",
    header: "Rank",
    render: (row) => (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#135d54] font-bold text-white">
        {row.rank}
      </span>
    ),
  },
  {
    key: "learner",
    header: "Learner",
    render: (row) => (
      <div>
        <p className="font-bold text-[#17211f] dark:text-white">{row.userEmail}</p>
        <p className="mt-1 text-xs text-[#6c7d78] dark:text-white/55">
          {row.schoolName} - {row.className} - {row.subjectName}
        </p>
      </div>
    ),
  },
  {
    key: "level",
    header: "Level",
    render: (row) => <span className="font-bold">{row.level}</span>,
  },
  {
    key: "badges",
    header: "Badges",
    render: (row) => <span className="font-bold">{row.badgeCount}</span>,
  },
  {
    key: "score",
    header: "Points",
    render: (row) => <span className="text-lg font-bold text-[#135d54]">{row.score}</span>,
  },
];

export default function LeaderboardsModule({ role }: LeaderboardsModuleProps) {
  const [filters, setFilters] = useState<LeaderboardFilters>(defaultFilters);
  const [data, setData] = useState<LeaderboardDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboards = async () => {
    const user = auth.currentUser;
    setError("");
    setLoading(true);

    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      await getAchievementDashboard(role === "teacher" ? "teacher" : "student", user.uid, user.email || "Educor learner");
      setData(await getLeaderboardDashboard(user.uid, filters));
    } catch {
      setError("Leaderboards could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialLeaderboards = async () => {
      const user = auth.currentUser;
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        await getAchievementDashboard(role === "teacher" ? "teacher" : "student", user.uid, user.email || "Educor learner");
        const leaderboardData = await getLeaderboardDashboard(user.uid, filters);
        if (mounted) setData(leaderboardData);
      } catch {
        if (mounted) setError("Leaderboards could not be loaded. Check your connection and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialLeaderboards();

    return () => {
      mounted = false;
    };
  }, [filters, role]);

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
      <LeaderboardState
        icon={RefreshCw}
        title="Leaderboards did not load"
        message={error}
        actionLabel="Try again"
        onAction={loadLeaderboards}
      />
    );
  }

  if (!data) {
    return (
      <LeaderboardState
        icon={AlertCircle}
        title="No leaderboard profile"
        message="Open Achievements first or sign in again so Educor can sync your leaderboard profile."
      />
    );
  }

  const winner = data.topRows[0];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#135d54] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(216,84,53,0.42),_transparent_34%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Leaderboards
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              Rankings for school, class, subject, week, and month.
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              Educor turns XP, badges, levels, and activity into competitive rankings that stay responsive across every cohort.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/15 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase text-white/60">Current leader</p>
              <Crown size={24} aria-hidden="true" />
            </div>
            <p className="mt-3 truncate text-2xl font-bold">{winner?.userEmail ?? "No entries yet"}</p>
            <p className="mt-2 text-sm text-white/70">{winner ? `${winner.score} points` : data.scopeLabel}</p>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-3 rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl md:grid-cols-[1fr_220px_220px] md:items-center dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center gap-3 text-[#135d54]">
          <Filter size={20} aria-hidden="true" />
          <div>
            <p className="font-bold">{data.scopeLabel}</p>
            <p className="text-sm text-[#52645f] dark:text-white/65">{data.periodLabel} rankings</p>
          </div>
        </div>

        <label>
          <span className="sr-only">Leaderboard scope</span>
          <select
            value={filters.scope}
            onChange={(event) => setFilters((current) => ({ ...current, scope: event.target.value as LeaderboardFilters["scope"] }))}
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          >
            <option value="school">School rankings</option>
            <option value="class">Class rankings</option>
            <option value="subject">Subject rankings</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Leaderboard period</span>
          <select
            value={filters.period}
            onChange={(event) => setFilters((current) => ({ ...current, period: event.target.value as LeaderboardFilters["period"] }))}
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          >
            <option value="weekly">Weekly rankings</option>
            <option value="monthly">Monthly rankings</option>
            <option value="all_time">All-time rankings</option>
          </select>
        </label>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Top three</h2>
              <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Animated podium for the current ranking view.</p>
            </div>
            <Trophy className="text-[#135d54]" size={22} aria-hidden="true" />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3 md:items-end">
            {data.topRows.slice(0, 3).map((row, index) => (
              <motion.article
                key={row.userId}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-xl border p-4 text-center ${
                  index === 0 ? "border-[#d85435] bg-[#fff1ec]" : "border-[#dbe7e2] bg-[#f8fbfa] dark:border-white/10 dark:bg-white/5"
                }`}
                style={{ minHeight: `${index === 0 ? 220 : index === 1 ? 180 : 150}px` }}
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#135d54] font-bold text-white">
                  {row.rank}
                </div>
                <p className="mt-4 truncate font-bold">{row.userEmail}</p>
                <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Level {row.level}</p>
                <p className="mt-4 text-2xl font-bold text-[#135d54]">{row.score}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <BarChart title="Top performers" items={data.chartItems} valueSuffix="" />
      </section>

      {data.currentUserRow && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#135d54] bg-[#eef7f4] p-5 text-[#135d54] shadow-sm"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Medal size={24} aria-hidden="true" />
              <div>
                <p className="font-bold">Your current rank</p>
                <p className="text-sm">Rank {data.currentUserRow.rank} in {data.scopeLabel}</p>
              </div>
            </div>
            <p className="text-3xl font-bold">{data.currentUserRow.score}</p>
          </div>
        </motion.section>
      )}

      <DataTable
        columns={columns}
        rows={data.rows}
        getRowKey={(row) => row.userId}
        emptyState={
          <LeaderboardState
            icon={BarChart3}
            title="No leaderboard entries yet"
            message="Open Achievements to sync XP profiles, then rankings will appear here."
          />
        }
      />
    </div>
  );
}
