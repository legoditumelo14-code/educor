import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { getProgressDashboard } from "./progress";
import type {
  AchievementDashboardData,
  AchievementDefinition,
  AchievementKind,
  AchievementProfile,
  AchievementUnlock,
  LeaderboardEntry,
} from "../types/achievement";
import type { ProgressDashboardData, ProgressRole } from "../types/progress";

const profilesCollection = collection(db, "achievementProfiles");
const eventsCollection = collection(db, "achievementEvents");

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: "first-course",
    kind: "badge",
    title: "First finish",
    description: "Complete your first course.",
    xp: 250,
    requirement: "1 completed course",
  },
  {
    id: "assignment-closer",
    kind: "badge",
    title: "Assignment closer",
    description: "Complete at least 80% of assigned work.",
    xp: 200,
    requirement: "80% assignment completion",
  },
  {
    id: "quiz-ace",
    kind: "badge",
    title: "Quiz ace",
    description: "Average 75% or higher across quiz attempts.",
    xp: 220,
    requirement: "75% quiz average",
  },
  {
    id: "streak-builder",
    kind: "badge",
    title: "Streak builder",
    description: "Build a three-day learning streak.",
    xp: 180,
    requirement: "3 day streak",
  },
  {
    id: "weekly-focus",
    kind: "milestone",
    title: "Weekly focus",
    description: "Log 120 minutes of learning activity in a week.",
    xp: 300,
    requirement: "120 weekly minutes",
  },
  {
    id: "five-quizzes",
    kind: "milestone",
    title: "Quiz habit",
    description: "Save five quiz attempts.",
    xp: 260,
    requirement: "5 quiz attempts",
  },
  {
    id: "course-collector",
    kind: "milestone",
    title: "Course collector",
    description: "Complete three courses.",
    xp: 500,
    requirement: "3 completed courses",
  },
  {
    id: "certificate-reward",
    kind: "reward",
    title: "Certificate spotlight",
    description: "Unlock a certificate showcase reward.",
    xp: 350,
    requirement: "1 completed course",
  },
  {
    id: "leaderboard-boost",
    kind: "reward",
    title: "Leaderboard boost",
    description: "Earn bonus leaderboard points for strong weekly focus.",
    xp: 200,
    requirement: "120 weekly minutes",
  },
];

const toMillis = (value: unknown) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();

  const maybeTimestamp = value as Partial<Timestamp>;
  if (typeof maybeTimestamp.toMillis === "function") {
    return maybeTimestamp.toMillis();
  }

  return 0;
};

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const stringOrDefault = (value: unknown, fallback: string) => (typeof value === "string" && value.trim() ? value.trim() : fallback);

const levelFromXp = (xp: number) => {
  const level = Math.floor(Math.sqrt(Math.max(xp, 0) / 250)) + 1;
  const currentThreshold = (level - 1) ** 2 * 250;
  const nextThreshold = level ** 2 * 250;

  return {
    level,
    currentLevelXp: Math.max(xp - currentThreshold, 0),
    nextLevelXp: Math.max(nextThreshold - currentThreshold, 1),
  };
};

const mapProfile = (id: string, data: DocumentData): AchievementProfile => {
  const xp = typeof data.xp === "number" ? data.xp : 0;
  const levelData = levelFromXp(xp);

  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : id,
    userEmail: typeof data.userEmail === "string" ? data.userEmail : "Educor learner",
    xp,
    level: typeof data.level === "number" ? data.level : levelData.level,
    currentLevelXp:
      typeof data.currentLevelXp === "number" ? data.currentLevelXp : levelData.currentLevelXp,
    nextLevelXp: typeof data.nextLevelXp === "number" ? data.nextLevelXp : levelData.nextLevelXp,
    leaderboardPoints: typeof data.leaderboardPoints === "number" ? data.leaderboardPoints : xp,
    weeklyPoints: typeof data.weeklyPoints === "number" ? data.weeklyPoints : 0,
    monthlyPoints: typeof data.monthlyPoints === "number" ? data.monthlyPoints : 0,
    schoolName: stringOrDefault(data.schoolName, "Educor School"),
    className: stringOrDefault(data.className, "General Class"),
    subjectName: stringOrDefault(data.subjectName, "General Studies"),
    badgeIds: normalizeStringArray(data.badgeIds),
    milestoneIds: normalizeStringArray(data.milestoneIds),
    rewardIds: normalizeStringArray(data.rewardIds),
    updatedAtMs: toMillis(data.updatedAt),
  };
};

const isEarned = (definition: AchievementDefinition, progress: ProgressDashboardData) => {
  if (definition.id === "first-course") return progress.completedCourses >= 1;
  if (definition.id === "assignment-closer") return progress.assignmentCompletionPercent >= 80;
  if (definition.id === "quiz-ace") return progress.quizAttempts > 0 && progress.quizAveragePercent >= 75;
  if (definition.id === "streak-builder") return progress.learningStreakDays >= 3;
  if (definition.id === "weekly-focus") return progress.weeklyStudyMinutes >= 120;
  if (definition.id === "five-quizzes") return progress.quizAttempts >= 5;
  if (definition.id === "course-collector") return progress.completedCourses >= 3;
  if (definition.id === "certificate-reward") return progress.completedCourses >= 1;
  if (definition.id === "leaderboard-boost") return progress.weeklyStudyMinutes >= 120;
  return false;
};

const idsForKind = (kind: AchievementKind, progress: ProgressDashboardData) =>
  ACHIEVEMENT_DEFINITIONS.filter((definition) => definition.kind === kind && isEarned(definition, progress)).map(
    (definition) => definition.id
  );

const baseXpFromProgress = (progress: ProgressDashboardData) =>
  progress.completedCourses * 400 +
  progress.completedAssignments * 120 +
  progress.quizAttempts * 80 +
  Math.round(progress.quizAveragePercent * 2) +
  Math.min(progress.weeklyStudyMinutes * 2, 500) +
  progress.learningStreakDays * 50;

const definitionsById = new Map(ACHIEVEMENT_DEFINITIONS.map((definition) => [definition.id, definition]));

const unlocksFromDiff = (
  previous: AchievementProfile | null,
  nextBadgeIds: string[],
  nextMilestoneIds: string[],
  nextRewardIds: string[]
): AchievementUnlock[] => {
  const previousIds = new Set([
    ...(previous?.badgeIds ?? []),
    ...(previous?.milestoneIds ?? []),
    ...(previous?.rewardIds ?? []),
  ]);

  return [...nextBadgeIds, ...nextMilestoneIds, ...nextRewardIds]
    .filter((id) => !previousIds.has(id))
    .map((id) => definitionsById.get(id))
    .filter((definition): definition is AchievementDefinition => Boolean(definition))
    .map((definition) => ({
      id: definition.id,
      kind: definition.kind,
      title: definition.title,
      description: definition.description,
      xp: definition.xp,
    }));
};

const leaderboardEntry = (profile: AchievementProfile): LeaderboardEntry => ({
  userId: profile.userId,
  userEmail: profile.userEmail,
  level: profile.level,
  xp: profile.xp,
  leaderboardPoints: profile.leaderboardPoints,
  weeklyPoints: profile.weeklyPoints,
  monthlyPoints: profile.monthlyPoints,
  schoolName: profile.schoolName,
  className: profile.className,
  subjectName: profile.subjectName,
  badgeCount: profile.badgeIds.length,
});

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const leaderboardQuery = query(profilesCollection, orderBy("leaderboardPoints", "desc"), limit(10));
  const snapshot = await getDocs(leaderboardQuery);

  return snapshot.docs.map((profileDoc) => leaderboardEntry(mapProfile(profileDoc.id, profileDoc.data())));
};

export const getAchievementProfiles = async (): Promise<AchievementProfile[]> => {
  const snapshot = await getDocs(profilesCollection);

  return snapshot.docs
    .map((profileDoc) => mapProfile(profileDoc.id, profileDoc.data()))
    .sort((a, b) => b.leaderboardPoints - a.leaderboardPoints);
};

export const getAchievementDashboard = async (
  role: ProgressRole,
  userId: string,
  userEmail: string
): Promise<AchievementDashboardData> => {
  const progress = await getProgressDashboard(role, userId);
  const profileRef = doc(db, "achievementProfiles", userId);
  const [profileSnap, userSnap] = await Promise.all([getDoc(profileRef), getDoc(doc(db, "users", userId))]);
  const previousProfile = profileSnap.exists() ? mapProfile(profileSnap.id, profileSnap.data()) : null;
  const userData = userSnap.exists() ? userSnap.data() : {};

  const badgeIds = idsForKind("badge", progress);
  const milestoneIds = idsForKind("milestone", progress);
  const rewardIds = idsForKind("reward", progress);
  const achievementXp = [...badgeIds, ...milestoneIds, ...rewardIds].reduce(
    (total, id) => total + (definitionsById.get(id)?.xp ?? 0),
    0
  );
  const xp = baseXpFromProgress(progress) + achievementXp;
  const levelData = levelFromXp(xp);
  const leaderboardPoints = xp + badgeIds.length * 150 + milestoneIds.length * 100 + rewardIds.length * 80;
  const weeklyPoints =
    progress.weeklyStudyMinutes * 2 +
    progress.learningStreakDays * 40 +
    Math.round(progress.quizAveragePercent) +
    progress.completedAssignments * 50;
  const monthlyPoints =
    weeklyPoints * 4 +
    progress.completedCourses * 300 +
    progress.quizAttempts * 60 +
    progress.completedAssignments * 80;
  const schoolName = stringOrDefault(userData.schoolName, "Educor School");
  const className = stringOrDefault(userData.className, role === "teacher" ? "Teacher Cohort" : "General Class");
  const subjectName = stringOrDefault(userData.subjectName, "General Studies");

  const profile: AchievementProfile = {
    id: userId,
    userId,
    userEmail,
    xp,
    level: levelData.level,
    currentLevelXp: levelData.currentLevelXp,
    nextLevelXp: levelData.nextLevelXp,
    leaderboardPoints,
    weeklyPoints,
    monthlyPoints,
    schoolName,
    className,
    subjectName,
    badgeIds,
    milestoneIds,
    rewardIds,
    updatedAtMs: Date.now(),
  };

  const unlocked = unlocksFromDiff(previousProfile, badgeIds, milestoneIds, rewardIds);

  await setDoc(
    profileRef,
    {
      userId,
      userEmail,
      xp,
      level: profile.level,
      currentLevelXp: profile.currentLevelXp,
      nextLevelXp: profile.nextLevelXp,
      leaderboardPoints,
      weeklyPoints,
      monthlyPoints,
      schoolName,
      className,
      subjectName,
      badgeIds,
      milestoneIds,
      rewardIds,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await Promise.all(
    unlocked.map((item) =>
      addDoc(eventsCollection, {
        userId,
        userEmail,
        achievementId: item.id,
        kind: item.kind,
        title: item.title,
        xp: item.xp,
        createdAt: serverTimestamp(),
      })
    )
  );

  const leaderboard = await getLeaderboard();

  return {
    profile,
    badges: ACHIEVEMENT_DEFINITIONS.filter((definition) => definition.kind === "badge"),
    milestones: ACHIEVEMENT_DEFINITIONS.filter((definition) => definition.kind === "milestone"),
    rewards: ACHIEVEMENT_DEFINITIONS.filter((definition) => definition.kind === "reward"),
    unlocked,
    leaderboard,
  };
};
