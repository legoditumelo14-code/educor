import { getAllAssignmentSubmissions, getAssignments, getSubmissionsForStudent } from "./assignments";
import { getAllCertificates, getCertificatesForStudent } from "./certificates";
import { getCourses } from "./courses";
import { getAllLessonProgress, getLessonProgress, getLessons } from "./lessons";
import { getAllQuizAttempts, getQuizAttemptsForStudent } from "./quizzes";
import type { AssignmentSubmission } from "../types/assignment";
import type { CourseCertificate } from "../types/certificate";
import type { LessonProgress } from "../types/lesson";
import type { QuizAttempt } from "../types/quiz";
import type {
  AchievementBadge,
  ProgressActivity,
  ProgressChartItem,
  ProgressDashboardData,
  ProgressRole,
  WeeklyStudyPoint,
} from "../types/progress";

const dayMs = 24 * 60 * 60 * 1000;

const clampPercent = (value: number) => Math.max(0, Math.min(Math.round(value), 100));

const dateKey = (millis: number) => new Date(millis).toISOString().slice(0, 10);

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const formatDayLabel = (millis: number) =>
  new Date(millis).toLocaleDateString(undefined, { weekday: "short" });

const assignmentCompleted = (submission: AssignmentSubmission) =>
  submission.status === "submitted" || submission.status === "late" || submission.status === "graded";

const uniqueCount = (values: string[]) => new Set(values.filter(Boolean)).size;

const buildWeeklyStudy = (activity: ProgressActivity[], quizAttempts: QuizAttempt[]): WeeklyStudyPoint[] => {
  const todayStart = startOfDay(new Date());
  const points = Array.from({ length: 7 }, (_, index) => {
    const dayStart = todayStart - (6 - index) * dayMs;
    return {
      key: dateKey(dayStart),
      label: formatDayLabel(dayStart),
      minutes: 0,
    };
  });
  const pointMap = new Map(points.map((point) => [point.key, point]));

  activity.forEach((item) => {
    const point = pointMap.get(dateKey(item.occurredAtMs));
    if (!point) return;

    if (item.kind === "lesson") point.minutes += 25;
    if (item.kind === "assignment") point.minutes += 30;
    if (item.kind === "course" || item.kind === "certificate") point.minutes += 45;
  });

  quizAttempts.forEach((attempt) => {
    const point = pointMap.get(dateKey(attempt.submittedAtMs));
    if (!point) return;
    point.minutes += Math.max(Math.round(attempt.timeSpentSeconds / 60), 1);
  });

  return points.map(({ label, minutes }) => ({ label, minutes }));
};

const buildStreak = (activity: ProgressActivity[]) => {
  const activeDays = new Set(activity.map((item) => dateKey(item.occurredAtMs)));
  const todayStart = startOfDay(new Date());
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const key = dateKey(todayStart - offset * dayMs);
    if (!activeDays.has(key)) break;
    streak += 1;
  }

  return streak;
};

const buildBadges = (
  data: Pick<
    ProgressDashboardData,
    | "completedCourses"
    | "weeklyStudyMinutes"
    | "learningStreakDays"
    | "assignmentCompletionPercent"
    | "quizAveragePercent"
    | "quizAttempts"
  >
): AchievementBadge[] => [
  {
    id: "course-finisher",
    title: "Course finisher",
    description: "Complete at least one course.",
    earned: data.completedCourses > 0,
  },
  {
    id: "weekly-focus",
    title: "Weekly focus",
    description: "Log 120 minutes of learning activity this week.",
    earned: data.weeklyStudyMinutes >= 120,
  },
  {
    id: "streak-builder",
    title: "Streak builder",
    description: "Keep a learning streak for three days.",
    earned: data.learningStreakDays >= 3,
  },
  {
    id: "assignment-closer",
    title: "Assignment closer",
    description: "Reach 80% assignment completion.",
    earned: data.assignmentCompletionPercent >= 80,
  },
  {
    id: "quiz-sharp",
    title: "Quiz sharp",
    description: "Average 75% or higher across quiz attempts.",
    earned: data.quizAttempts > 0 && data.quizAveragePercent >= 75,
  },
];

const lessonActivities = (progress: LessonProgress[]): ProgressActivity[] =>
  progress
    .filter((item) => item.updatedAtMs)
    .map((item) => ({
      id: `lesson-${item.id}`,
      kind: "lesson",
      title: item.completed ? "Lesson completed" : "Lesson progress updated",
      detail: `${item.progressPercent}% complete`,
      occurredAtMs: item.updatedAtMs,
    }));

const assignmentActivities = (submissions: AssignmentSubmission[]): ProgressActivity[] =>
  submissions
    .filter((item) => item.updatedAtMs || item.submittedAtMs)
    .map((item) => ({
      id: `assignment-${item.id}`,
      kind: "assignment",
      title: item.status === "graded" ? "Assignment graded" : "Assignment submitted",
      detail: `${item.studentEmail} - ${item.status.replace("_", " ")}`,
      occurredAtMs: item.submittedAtMs || item.updatedAtMs,
    }));

const quizActivities = (attempts: QuizAttempt[]): ProgressActivity[] =>
  attempts
    .filter((item) => item.submittedAtMs)
    .map((item) => ({
      id: `quiz-${item.id}`,
      kind: "quiz",
      title: "Quiz score saved",
      detail: `${item.quizTitle} - ${item.percentage}%`,
      occurredAtMs: item.submittedAtMs,
    }));

const certificateActivities = (certificates: CourseCertificate[]): ProgressActivity[] =>
  certificates
    .filter((item) => item.completedAtMs || item.issuedAtMs || item.updatedAtMs)
    .map((item) => ({
      id: `certificate-${item.id}`,
      kind: item.status === "approved" ? "certificate" : "course",
      title: item.status === "approved" ? "Certificate issued" : "Course completed",
      detail: `${item.courseTitle} - ${item.status}`,
      occurredAtMs: item.issuedAtMs || item.completedAtMs || item.updatedAtMs,
    }));

export const getProgressDashboard = async (
  role: ProgressRole,
  userId: string
): Promise<ProgressDashboardData> => {
  const [courses, assignments, lessons] = await Promise.all([getCourses(), getAssignments(), getLessons()]);

  const [certificates, submissions, quizAttempts, lessonProgress] =
    role === "teacher"
      ? await Promise.all([
          getAllCertificates(),
          getAllAssignmentSubmissions(),
          getAllQuizAttempts(),
          getAllLessonProgress(),
        ])
      : await Promise.all([
          getCertificatesForStudent(userId),
          getSubmissionsForStudent(userId).then((items) => Object.values(items)),
          getQuizAttemptsForStudent(userId).then((items) => Object.values(items)),
          getLessonProgress(userId).then((items) => Object.values(items)),
        ]);

  const completedCourseIds = uniqueCount(certificates.map((certificate) => certificate.courseId));
  const courseCompletionPercent = courses.length
    ? clampPercent((completedCourseIds / courses.length) * 100)
    : 0;
  const completedAssignments = submissions.filter(assignmentCompleted).length;
  const totalAssignments = role === "teacher" ? Math.max(assignments.length, submissions.length) : assignments.length;
  const assignmentCompletionPercent = totalAssignments
    ? clampPercent((completedAssignments / totalAssignments) * 100)
    : 0;
  const quizAveragePercent = quizAttempts.length
    ? Math.round(quizAttempts.reduce((total, attempt) => total + attempt.percentage, 0) / quizAttempts.length)
    : 0;
  const lessonCompletionPercent = lessons.length
    ? clampPercent((lessonProgress.filter((item) => item.completed).length / lessons.length) * 100)
    : 0;

  const activity = [
    ...lessonActivities(lessonProgress),
    ...assignmentActivities(submissions),
    ...quizActivities(quizAttempts),
    ...certificateActivities(certificates),
  ].sort((a, b) => b.occurredAtMs - a.occurredAtMs);
  const weeklyStudy = buildWeeklyStudy(activity, quizAttempts);
  const weeklyStudyMinutes = weeklyStudy.reduce((total, point) => total + point.minutes, 0);
  const learningStreakDays = buildStreak(activity);

  const baseData = {
    role,
    courseCompletionPercent,
    completedCourses: completedCourseIds,
    totalCourses: courses.length,
    weeklyStudyMinutes,
    weeklyStudy,
    learningStreakDays,
    assignmentCompletionPercent,
    completedAssignments,
    totalAssignments,
    quizAveragePercent,
    quizAttempts: quizAttempts.length,
    activity: activity.slice(0, 8),
    charts: {
      completion: [
        { label: "Courses", value: courseCompletionPercent, tone: "green" },
        { label: "Lessons", value: lessonCompletionPercent, tone: "blue" },
        { label: "Assignments", value: assignmentCompletionPercent, tone: "orange" },
      ] satisfies ProgressChartItem[],
      performance: [
        { label: "Quiz average", value: quizAveragePercent, tone: "green" },
        { label: "Assignment completion", value: assignmentCompletionPercent, tone: "orange" },
        { label: "Course completion", value: courseCompletionPercent, tone: "blue" },
      ] satisfies ProgressChartItem[],
    },
  } satisfies Omit<ProgressDashboardData, "achievementBadges">;

  return {
    ...baseData,
    achievementBadges: buildBadges(baseData),
  };
};
