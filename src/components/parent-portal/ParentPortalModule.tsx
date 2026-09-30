import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  BookOpenCheck,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Loader2,
  LockKeyhole,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import clsx from "clsx";
import BarChart from "../ui/BarChart";
import { auth } from "../../lib/firebase";
import {
  getParentPortalData,
  linkParentLearner,
  markParentNotificationRead,
} from "../../lib/parentPortal";
import type { AssignmentSubmission } from "../../types/assignment";
import type { ParentLearner, ParentNotification, ParentPortalData } from "../../types/parentPortal";
import ParentPortalState from "./ParentPortalState";

interface ParentPortalModuleProps {
  role: "student" | "teacher" | "parent" | null;
}

const skeletonCards = Array.from({ length: 6 }, (_, index) => index);

const emptyData: ParentPortalData = {
  learners: [],
  selectedLearner: null,
  progress: null,
  assignments: [],
  submissions: [],
  attendance: [],
  attendanceSummary: {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendancePercent: 0,
  },
  notifications: [],
  teacherThreads: [],
};

const statusStyles: Record<string, string> = {
  present: "bg-[#eef7f4] text-[#135d54]",
  absent: "bg-[#fff1ec] text-[#9d321f]",
  late: "bg-[#fff7df] text-[#8a6415]",
  excused: "bg-[#edf5fb] text-[#2f6f9f]",
  not_submitted: "bg-[#f0f3f2] text-[#52645f]",
  draft: "bg-[#fff7df] text-[#8a6415]",
  submitted: "bg-[#eef7f4] text-[#135d54]",
  late_submission: "bg-[#fff1ec] text-[#9d321f]",
  graded: "bg-[#edf5fb] text-[#2f6f9f]",
};

const formatDate = (date: string) => {
  if (!date) return "No date";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatTime = (millis: number) => {
  if (!millis) return "Recently";
  return new Date(millis).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const assignmentStatus = (submission?: AssignmentSubmission) => {
  if (!submission) return "not_submitted";
  return submission.status === "late" ? "late_submission" : submission.status;
};

function LinkLearnerForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (studentEmail: string, displayName: string, gradeLevel: string) => Promise<void>;
}) {
  const [studentEmail, setStudentEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (!studentEmail.trim()) {
      setValidationError("Add the learner email.");
      return;
    }

    await onSubmit(studentEmail, displayName, gradeLevel);
    setStudentEmail("");
    setDisplayName("");
    setGradeLevel("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[#d85435]">Learner link</p>
          <h2 className="mt-1 text-xl font-bold">Connect a learner</h2>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
          <UserPlus size={22} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        <input
          type="email"
          value={studentEmail}
          onChange={(event) => setStudentEmail(event.target.value)}
          placeholder="learner@example.com"
          className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Learner display name"
          className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
        <input
          value={gradeLevel}
          onChange={(event) => setGradeLevel(event.target.value)}
          placeholder="Grade level"
          className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
      </div>

      {validationError && (
        <p className="mt-4 rounded-lg bg-[#fff1ec] px-4 py-3 text-sm font-semibold text-[#9d321f]">
          {validationError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send size={17} aria-hidden="true" />
        {submitting ? "Linking..." : "Link learner"}
      </button>
    </form>
  );
}

export default function ParentPortalModule({ role }: ParentPortalModuleProps) {
  const [data, setData] = useState<ParentPortalData>(emptyData);
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const isParent = role === "parent";

  const loadPortal = async (learnerId = selectedLearnerId) => {
    const user = auth.currentUser;
    setError("");
    setLoading(true);

    if (!user || !isParent) {
      setData(emptyData);
      setLoading(false);
      return;
    }

    try {
      const portalData = await getParentPortalData(user.uid, user.email || "parent@example.com", learnerId);
      setData(portalData);
      setSelectedLearnerId(portalData.selectedLearner?.studentId ?? "");
    } catch {
      setError("Parent portal data could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialPortal = async () => {
      const user = auth.currentUser;

      if (!user || role !== "parent") {
        if (mounted) {
          setData(emptyData);
          setLoading(false);
        }
        return;
      }

      try {
        const portalData = await getParentPortalData(user.uid, user.email || "parent@example.com");
        if (!mounted) return;
        setData(portalData);
        setSelectedLearnerId(portalData.selectedLearner?.studentId ?? "");
      } catch {
        if (mounted) setError("Parent portal data could not be loaded. Check your connection and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialPortal();

    return () => {
      mounted = false;
    };
  }, [role]);

  const submissionsByAssignment = useMemo(
    () =>
      data.submissions.reduce<Record<string, AssignmentSubmission>>((submissionMap, submission) => {
        if (submission.assignmentId) submissionMap[submission.assignmentId] = submission;
        return submissionMap;
      }, {}),
    [data.submissions]
  );

  const unreadNotifications = useMemo(
    () => data.notifications.filter((notification) => !notification.read).length,
    [data.notifications]
  );

  const handleLearnerChange = async (studentId: string) => {
    setSelectedLearnerId(studentId);
    await loadPortal(studentId);
  };

  const handleLinkLearner = async (studentEmail: string, displayName: string, gradeLevel: string) => {
    const user = auth.currentUser;
    if (!user) return;

    setActionError("");
    setSubmitting(true);

    try {
      await linkParentLearner(user.uid, studentEmail, displayName, gradeLevel);
      await loadPortal();
    } catch {
      setActionError("Learner could not be linked. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReadNotification = async (notification: ParentNotification) => {
    setBusyId(notification.id);
    setActionError("");

    try {
      await markParentNotificationRead(notification);
      await loadPortal();
    } catch {
      setActionError("Notification could not be marked as read.");
    } finally {
      setBusyId("");
    }
  };

  if (!isParent) {
    return (
      <ParentPortalState
        icon={LockKeyhole}
        title="Parent portal is role protected"
        message="This workspace is available to accounts with the parent role. Ask an administrator to assign the parent role and link learners."
      />
    );
  }

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
      <ParentPortalState
        icon={RefreshCw}
        title="Parent portal did not load"
        message={error}
        actionLabel="Try again"
        onAction={() => loadPortal()}
      />
    );
  }

  const progress = data.progress;

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
              Parent Portal
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              Learner progress, attendance, assignments, and communication in one parent view.
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              Role-protected monitoring gives parents a clear pulse on learning momentum and teacher updates.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/15 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-white/60">Selected learner</p>
              <Users size={22} aria-hidden="true" />
            </div>
            <p className="mt-4 text-3xl font-bold">{data.selectedLearner?.displayName ?? "No learner"}</p>
            <p className="mt-2 text-sm text-white/70">{data.selectedLearner?.gradeLevel ?? "Link a learner to begin"}</p>
          </div>
        </div>
      </motion.section>

      {actionError && (
        <section className="flex items-start gap-3 rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-[#9d321f]">
          <AlertCircle className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
          <p className="font-semibold">{actionError}</p>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <div className="grid gap-3 md:grid-cols-[1fr_220px] md:items-center">
              <div>
                <h2 className="font-bold">Learners</h2>
                <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Switch between linked learner profiles.</p>
              </div>
              <select
                value={selectedLearnerId}
                onChange={(event) => handleLearnerChange(event.target.value)}
                className="rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
              >
                {data.learners.length === 0 && <option value="">No linked learners</option>}
                {data.learners.map((learner: ParentLearner) => (
                  <option key={learner.id} value={learner.studentId}>
                    {learner.displayName}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {data.learners.length === 0 ? (
            <ParentPortalState
              icon={UserPlus}
              title="No learners linked yet"
              message="Link a learner to begin viewing progress, attendance, assignments, and parent notifications."
            />
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Course progress",
                    value: `${progress?.courseCompletionPercent ?? 0}%`,
                    icon: GraduationCap,
                  },
                  {
                    label: "Attendance",
                    value: `${data.attendanceSummary.attendancePercent}%`,
                    icon: CalendarCheck,
                  },
                  {
                    label: "Assignments",
                    value: `${progress?.completedAssignments ?? 0}/${progress?.totalAssignments ?? data.assignments.length}`,
                    icon: ClipboardList,
                  },
                  {
                    label: "Unread updates",
                    value: unreadNotifications,
                    icon: Bell,
                  },
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
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
                        <Icon size={22} aria-hidden="true" />
                      </span>
                      <p className="mt-4 text-sm font-semibold text-[#52645f] dark:text-white/65">{item.label}</p>
                      <p className="mt-1 text-3xl font-bold">{item.value}</p>
                    </motion.article>
                  );
                })}
              </section>

              {progress && (
                <section className="grid gap-4 lg:grid-cols-2">
                  <BarChart title="Performance analytics" items={progress.charts.performance} />
                  <BarChart title="Completion analytics" items={progress.charts.completion} />
                </section>
              )}

              <section className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-bold">Attendance</h2>
                      <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Recent attendance records.</p>
                    </div>
                    <CalendarCheck className="text-[#135d54]" size={22} aria-hidden="true" />
                  </div>
                  <div className="mt-5 space-y-3">
                    {data.attendance.slice(0, 8).map((record) => (
                      <div key={record.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fbfa] p-3 dark:bg-white/5">
                        <div>
                          <p className="font-bold">{formatDate(record.date)}</p>
                          {record.note && <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">{record.note}</p>}
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[record.status]}`}>
                          {record.status}
                        </span>
                      </div>
                    ))}
                    {data.attendance.length === 0 && (
                      <p className="rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-4 text-sm font-semibold text-[#52645f] dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                        No attendance records yet.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-bold">Assignments</h2>
                      <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Submission status by assignment.</p>
                    </div>
                    <BookOpenCheck className="text-[#135d54]" size={22} aria-hidden="true" />
                  </div>
                  <div className="mt-5 space-y-3">
                    {data.assignments.slice(0, 8).map((assignment) => {
                      const submission = submissionsByAssignment[assignment.id];
                      const status = assignmentStatus(submission);

                      return (
                        <div key={assignment.id} className="rounded-xl bg-[#f8fbfa] p-3 dark:bg-white/5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold">{assignment.title}</p>
                              <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Due {formatDate(assignment.dueDate)}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[status]}`}>
                              {status.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {data.assignments.length === 0 && (
                      <p className="rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-4 text-sm font-semibold text-[#52645f] dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                        No assignments yet.
                      </p>
                    )}
                  </div>
                </section>
              </section>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <LinkLearnerForm submitting={submitting} onSubmit={handleLinkLearner} />

          <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Notifications</h2>
                <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Parent updates and alerts.</p>
              </div>
              <Bell className="text-[#135d54]" size={22} aria-hidden="true" />
            </div>
            <div className="mt-5 space-y-3">
              {data.notifications.slice(0, 6).map((notification) => (
                <div
                  key={notification.id}
                  className={clsx(
                    "rounded-xl border p-4",
                    notification.read ? "border-[#dbe7e2] bg-[#f8fbfa]" : "border-[#b7d5ce] bg-[#eef7f4]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{notification.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#52645f]">{notification.message}</p>
                      <p className="mt-2 text-xs font-semibold uppercase text-[#6c7d78]">{formatTime(notification.createdAtMs)}</p>
                    </div>
                    {!notification.read && (
                      <button
                        type="button"
                        onClick={() => handleReadNotification(notification)}
                        disabled={busyId === notification.id}
                        className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#135d54] disabled:opacity-60"
                      >
                        Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {data.notifications.length === 0 && (
                <p className="rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-4 text-sm font-semibold text-[#52645f] dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                  No parent notifications yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Teacher communication</h2>
                <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Recent parent-teacher threads.</p>
              </div>
              <MessageSquare className="text-[#135d54]" size={22} aria-hidden="true" />
            </div>
            <div className="mt-5 space-y-3">
              {data.teacherThreads.slice(0, 5).map((thread) => (
                <div key={thread.id} className="rounded-xl bg-[#f8fbfa] p-4 dark:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{thread.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-[#52645f] dark:text-white/65">
                        {thread.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    {thread.unread && <span className="h-2.5 w-2.5 rounded-full bg-[#d85435]" />}
                  </div>
                </div>
              ))}
              {data.teacherThreads.length === 0 && (
                <p className="rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-4 text-sm font-semibold text-[#52645f] dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                  No teacher conversations yet.
                </p>
              )}
            </div>
          </section>

          {submitting && (
            <section className="flex items-center gap-3 rounded-xl border border-white/45 bg-white/75 p-4 text-[#52645f] shadow-sm backdrop-blur-xl">
              <Loader2 className="animate-spin text-[#135d54]" size={18} aria-hidden="true" />
              <p className="font-semibold">Updating parent portal...</p>
            </section>
          )}

          <section className="rounded-xl border border-[#135d54] bg-[#eef7f4] p-5 text-[#135d54] shadow-sm">
            <div className="flex items-center gap-3">
              <TrendingUp size={22} aria-hidden="true" />
              <div>
                <h2 className="font-bold">Performance analytics</h2>
                <p className="mt-1 text-sm">Progress, attendance, assignments, quizzes, and study signals are combined for parent visibility.</p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
