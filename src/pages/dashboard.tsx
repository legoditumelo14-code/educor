import { useEffect, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import { motion } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import Layout, { type Tab } from "../components/Layout";
import AchievementSystemModule from "../components/achievements/AchievementSystemModule";
import AssignmentManagementModule from "../components/assignments/AssignmentManagementModule";
import CalendarModule from "../components/calendar/CalendarModule";
import CertificatesModule from "../components/certificates/CertificatesModule";
import CoursesModule from "../components/courses/CoursesModule";
import ForumsModule from "../components/forums/ForumsModule";
import GradebookModule from "../components/gradebook/GradebookModule";
import LeaderboardsModule from "../components/leaderboards/LeaderboardsModule";
import LessonBuilderModule from "../components/lessons/LessonBuilderModule";
import MessagingModule from "../components/messaging/MessagingModule";
import ParentPortalModule from "../components/parent-portal/ParentPortalModule";
import ProgressDashboardModule from "../components/progress/ProgressDashboardModule";
import QuizBuilderModule from "../components/quizzes/QuizBuilderModule";
import StudyPlannerModule from "../components/study-planner/StudyPlannerModule";
import TutorMarketplaceModule from "../components/tutors/TutorMarketplaceModule";
import { getAssignments } from "../lib/assignments";
import { getCourses } from "../lib/courses";
import { getLessons } from "../lib/lessons";
import { getQuizzes } from "../lib/quizzes";
import { auth, db } from "../lib/firebase";

type Role = "student" | "teacher" | "parent";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [lessonsCount, setLessonsCount] = useState(0);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignmentsCount, setAssignmentsCount] = useState(0);
  const [coursesCount, setCoursesCount] = useState(0);
  const [quizzesCount, setQuizzesCount] = useState(0);
  const learningRole = role === "teacher" ? "teacher" : "student";

  const refreshLessons = async () => {
    const lessonData = await getLessons();
    setLessonsCount(lessonData.length);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        setRole(docSnap.exists() ? (docSnap.data().role as Role) : "student");
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadWorkspaceData = async () => {
      const [lessonData, assignmentData, coursesData, quizData] = await Promise.all([
        getLessons(),
        getAssignments(),
        getCourses(),
        getQuizzes(),
      ]);

      if (!mounted) return;

      setLessonsCount(lessonData.length);
      setAssignmentsCount(assignmentData.length);
      setCoursesCount(coursesData.length);
      setQuizzesCount(quizData.length);
    };

    loadWorkspaceData();

    return () => {
      mounted = false;
    };
  }, []);

  const addLesson = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    await addDoc(collection(db, "lessons"), {
      title: newTitle,
      content: newContent,
      createdBy: auth.currentUser?.uid,
    });

    setNewTitle("");
    setNewContent("");
    setTab("lessons");
    await refreshLessons();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fbfa] text-[#17211f]">
        <p className="font-semibold">Loading Educor...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Educor Dashboard</title>
      </Head>

      <Layout activeTab={tab} setActiveTab={setTab}>
        {tab === "dashboard" && (
          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-lg bg-[#135d54] p-6 text-white shadow-sm md:p-8">
              <div className="relative z-10 max-w-2xl">
                <p className="text-sm font-semibold uppercase text-white/65">Overview</p>
                <h1 className="mt-2 text-3xl font-bold tracking-normal md:text-4xl">
                  Welcome back{auth.currentUser?.email ? `, ${auth.currentUser.email}` : ""}.
                </h1>
                <p className="mt-3 max-w-xl leading-7 text-white/82">
                  Educor keeps the daily workflow tied to the promise: publish lessons, assign work, and keep visible momentum.
                </p>
              </div>
              <Image
                src="/illustrations/onlineclass.svg"
                alt=""
                width={420}
                height={280}
                className="absolute bottom-[-42px] right-[-20px] hidden w-72 opacity-25 md:block"
              />
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {[
                { label: "Courses", value: coursesCount },
                { label: "Lessons", value: lessonsCount },
                { label: "Assignments", value: assignmentsCount },
                { label: "Quizzes", value: quizzesCount },
                {
                  label: "Account role",
                  value: role === "teacher" ? "Educator" : role === "parent" ? "Parent" : "Learner",
                },
                { label: "Progress focus", value: "75%" },
              ].map((item, index) => (
                <motion.article
                  key={item.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07 }}
                  className="rounded-lg border border-[#dbe7e2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <p className="text-sm text-[#6c7d78] dark:text-white/60">{item.label}</p>
                  <h2 className="mt-2 text-3xl font-bold">{item.value}</h2>
                </motion.article>
              ))}
            </section>

            <section className="rounded-lg border border-[#dbe7e2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
                <div>
                  <p className="text-sm font-semibold uppercase text-[#d85435]">Retention loop</p>
                  <h2 className="mt-2 text-2xl font-bold">Progress dashboard</h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-[#52645f] dark:text-white/65">
                  Progress visibility is now powered by course completions, study activity, streaks, assignments, quizzes, and achievements.
                </p>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    "Course completion",
                    "Weekly study",
                    "Achievement badges",
                  ].map((item, index) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="rounded-lg bg-[#eef7f4] px-4 py-3 text-sm font-semibold text-[#135d54]"
                    >
                      {item}
                    </motion.div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setTab("progress")}
                  className="rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942]"
                >
                  Open progress
                </button>
              </div>
            </section>
          </div>
        )}

        {tab === "courses" && <CoursesModule role={learningRole} onCoursesLoaded={setCoursesCount} />}

        {tab === "lessons" && <LessonBuilderModule role={learningRole} onLessonsLoaded={setLessonsCount} />}

        {tab === "add" && (
          <section className="max-w-3xl rounded-lg border border-[#dbe7e2] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            {role === "teacher" ? (
              <>
                <p className="text-sm font-semibold uppercase text-[#135d54]">Educator tool</p>
                <h1 className="mt-2 text-2xl font-bold">Add a lesson</h1>
                <p className="mt-2 text-[#52645f] dark:text-white/70">
                  Lessons are the content layer that helps Educor turn educator activity into repeat usage.
                </p>

                <div className="mt-6 space-y-3">
                  <input
                    type="text"
                    placeholder="Lesson title"
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    className="w-full rounded-lg border border-[#c9ded8] px-4 py-3 text-[#17211f] outline-none focus:border-[#135d54]"
                  />
                  <textarea
                    placeholder="Lesson content"
                    value={newContent}
                    onChange={(event) => setNewContent(event.target.value)}
                    className="min-h-36 w-full rounded-lg border border-[#c9ded8] px-4 py-3 text-[#17211f] outline-none focus:border-[#135d54]"
                  />
                  <button
                    onClick={addLesson}
                    className="rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942]"
                  >
                    Add lesson
                  </button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm font-semibold uppercase text-[#d85435]">Learner account</p>
                <h1 className="mt-2 text-2xl font-bold">Lesson creation is for educators.</h1>
                <p className="mt-2 text-[#52645f] dark:text-white/70">
                  Learners can view lessons and assignments. Educator accounts can publish content and manage class activity.
                </p>
              </div>
            )}
          </section>
        )}

        {tab === "assignments" && (
          <AssignmentManagementModule role={learningRole} onAssignmentsLoaded={setAssignmentsCount} />
        )}

        {tab === "gradebook" && <GradebookModule role={learningRole} />}

        {tab === "quizzes" && <QuizBuilderModule role={learningRole} onQuizzesLoaded={setQuizzesCount} />}

        {tab === "certificates" && <CertificatesModule role={learningRole} />}

        {tab === "progress" && <ProgressDashboardModule role={learningRole} />}

        {tab === "achievements" && <AchievementSystemModule role={learningRole} />}

        {tab === "leaderboards" && <LeaderboardsModule role={learningRole} />}

        {tab === "studyPlanner" && <StudyPlannerModule />}

        {tab === "calendar" && <CalendarModule role={learningRole} />}

        {tab === "messaging" && <MessagingModule role={learningRole} />}

        {tab === "forums" && <ForumsModule role={learningRole} />}

        {tab === "tutors" && <TutorMarketplaceModule role={learningRole} />}

        {tab === "parentPortal" && <ParentPortalModule role={role} />}
      </Layout>
    </>
  );
}
