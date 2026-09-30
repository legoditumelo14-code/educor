import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  BadgeCheck,
  Crown,
  Flame,
  Gift,
  Medal,
  RefreshCw,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { auth } from "../../lib/firebase";
import { getAchievementDashboard } from "../../lib/achievements";
import type { AchievementDashboardData, AchievementDefinition, AchievementUnlock } from "../../types/achievement";
import AchievementState from "./AchievementState";
import RewardPopup from "./RewardPopup";

interface AchievementSystemModuleProps {
  role: "student" | "teacher" | null;
}

const skeletonCards = Array.from({ length: 6 }, (_, index) => index);

const kindIcon = {
  badge: BadgeCheck,
  milestone: Medal,
  reward: Gift,
};

function AchievementTile({
  item,
  earned,
}: {
  item: AchievementDefinition;
  earned: boolean;
}) {
  const Icon = kindIcon[item.kind];

  return (
    <motion.article
      whileHover={{ y: -4 }}
      className={`rounded-xl border p-4 shadow-sm backdrop-blur-xl ${
        earned
          ? "border-[#b7d5ce] bg-[#eef7f4] text-[#135d54]"
          : "border-white/45 bg-white/70 text-[#52645f] dark:border-white/10 dark:bg-white/10 dark:text-white/65"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${earned ? "bg-white" : "bg-[#eef7f4]"}`}>
          <Icon size={24} aria-hidden="true" />
        </span>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#135d54] dark:bg-white/10">
          +{item.xp} XP
        </span>
      </div>
      <h3 className="mt-4 font-bold text-[#17211f] dark:text-white">{item.title}</h3>
      <p className="mt-2 text-sm leading-6">{item.description}</p>
      <p className="mt-3 text-xs font-bold uppercase">{earned ? "Unlocked" : item.requirement}</p>
    </motion.article>
  );
}

export default function AchievementSystemModule({ role }: AchievementSystemModuleProps) {
  const [data, setData] = useState<AchievementDashboardData | null>(null);
  const [unlocks, setUnlocks] = useState<AchievementUnlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAchievements = async () => {
    const user = auth.currentUser;
    setError("");
    setLoading(true);

    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      const achievementData = await getAchievementDashboard(
        role === "teacher" ? "teacher" : "student",
        user.uid,
        user.email || "Educor learner"
      );
      setData(achievementData);
      setUnlocks(achievementData.unlocked);
    } catch {
      setError("Achievements could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialAchievements = async () => {
      const user = auth.currentUser;
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const achievementData = await getAchievementDashboard(
          role === "teacher" ? "teacher" : "student",
          user.uid,
          user.email || "Educor learner"
        );
        if (!mounted) return;
        setData(achievementData);
        setUnlocks(achievementData.unlocked);
      } catch {
        if (mounted) setError("Achievements could not be loaded. Check your connection and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialAchievements();

    return () => {
      mounted = false;
    };
  }, [role]);

  const earnedIds = useMemo(
    () =>
      new Set([
        ...(data?.profile.badgeIds ?? []),
        ...(data?.profile.milestoneIds ?? []),
        ...(data?.profile.rewardIds ?? []),
      ]),
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
              className="h-44 animate-pulse rounded-xl border border-white/45 bg-white/60 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
            />
          ))}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <AchievementState
        icon={RefreshCw}
        title="Achievements did not load"
        message={error}
        actionLabel="Try again"
        onAction={loadAchievements}
      />
    );
  }

  if (!data) {
    return (
      <AchievementState
        icon={AlertCircle}
        title="No achievement profile"
        message="Sign in again so Educor can connect achievements to your account."
      />
    );
  }

  const levelPercent = Math.round((data.profile.currentLevelXp / data.profile.nextLevelXp) * 100);
  const earnedCount = earnedIds.size;
  const totalAchievements = data.badges.length + data.milestones.length + data.rewards.length;

  return (
    <div className="space-y-6">
      <RewardPopup unlocks={unlocks} onDismiss={() => setUnlocks([])} />

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
              Achievement System
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              XP, levels, badges, rewards, and leaderboard momentum.
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              Educor converts learning activity into visible progress loops that make achievement feel earned and shareable.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/15 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase text-white/60">Level {data.profile.level}</p>
              <Crown size={24} aria-hidden="true" />
            </div>
            <p className="mt-3 text-5xl font-bold">{data.profile.xp}</p>
            <p className="mt-1 text-sm text-white/70">total XP</p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(levelPercent, 100)}%` }}
                transition={{ duration: 0.8 }}
                className="h-full rounded-full bg-white"
              />
            </div>
            <p className="mt-2 text-sm text-white/70">
              {data.profile.currentLevelXp}/{data.profile.nextLevelXp} XP to next level
            </p>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Level", value: data.profile.level, helper: "Current rank", icon: Crown },
          { label: "XP", value: data.profile.xp, helper: "Learning energy", icon: Zap },
          { label: "Leaderboard", value: data.profile.leaderboardPoints, helper: "Total points", icon: Trophy },
          { label: "Unlocked", value: `${earnedCount}/${totalAchievements}`, helper: "Badges and rewards", icon: Award },
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
              <p className="mt-3 text-sm text-[#6c7d78] dark:text-white/55">{item.helper}</p>
            </motion.article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Badges</h2>
              <BadgeCheck className="text-[#135d54]" size={22} aria-hidden="true" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.badges.map((badge) => (
                <AchievementTile key={badge.id} item={badge} earned={earnedIds.has(badge.id)} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Milestones</h2>
              <Medal className="text-[#135d54]" size={22} aria-hidden="true" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.milestones.map((milestone) => (
                <AchievementTile key={milestone.id} item={milestone} earned={earnedIds.has(milestone.id)} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Rewards</h2>
              <Gift className="text-[#135d54]" size={22} aria-hidden="true" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.rewards.map((reward) => (
                <AchievementTile key={reward.id} item={reward} earned={earnedIds.has(reward.id)} />
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Leaderboard</h2>
              <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Ranked by leaderboard points.</p>
            </div>
            <Trophy className="text-[#135d54]" size={22} aria-hidden="true" />
          </div>

          <div className="mt-5 space-y-3">
            {data.leaderboard.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-5 text-[#52645f] dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                Leaderboard entries appear as learners earn XP.
              </div>
            )}

            {data.leaderboard.map((entry, index) => (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-xl border p-4 ${
                  entry.userId === data.profile.userId
                    ? "border-[#135d54] bg-[#eef7f4]"
                    : "border-[#dbe7e2] bg-[#f8fbfa] dark:border-white/10 dark:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#135d54] font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold">{entry.userEmail}</p>
                      <p className="mt-1 text-xs text-[#52645f] dark:text-white/65">
                        Level {entry.level} - {entry.badgeCount} badges
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-[#135d54]">{entry.leaderboardPoints}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </section>

      <section className="rounded-xl border border-white/45 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
            <Flame size={22} aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-bold">Reward loop</h3>
            <p className="mt-1 leading-7 text-[#52645f] dark:text-white/70">
              XP and leaderboard points are recalculated from Firestore-backed learning activity whenever this module syncs.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
