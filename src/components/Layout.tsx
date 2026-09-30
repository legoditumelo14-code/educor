import { ReactNode, useEffect, useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  BrainCircuit,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  MessageSquare,
  Moon,
  PlusCircle,
  Sun,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import clsx from "clsx";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAutoLogout } from "../hooks/useAutoLogout";
import { auth, db } from "../lib/firebase";
import NotificationCentre from "./notifications/NotificationCentre";

export const tabs = [
  "dashboard",
  "courses",
  "lessons",
  "add",
  "assignments",
  "gradebook",
  "quizzes",
  "certificates",
  "progress",
  "achievements",
  "leaderboards",
  "studyPlanner",
  "calendar",
  "messaging",
  "forums",
  "tutors",
  "parentPortal",
] as const;
export type Tab = (typeof tabs)[number];

const tabItems = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "courses", label: "Courses", icon: BookOpenCheck },
  { id: "lessons", label: "Lessons", icon: BookOpen },
  { id: "add", label: "Add lesson", icon: PlusCircle },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "gradebook", label: "Gradebook", icon: GraduationCap },
  { id: "quizzes", label: "Quizzes", icon: BrainCircuit },
  { id: "certificates", label: "Certificates", icon: Award },
  { id: "progress", label: "Progress", icon: BarChart3 },
  { id: "achievements", label: "Achievements", icon: Award },
  { id: "leaderboards", label: "Leaderboards", icon: ListOrdered },
  { id: "studyPlanner", label: "Study Planner", icon: CalendarCheck },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "messaging", label: "Messaging", icon: MessageSquare },
  { id: "forums", label: "Forums", icon: MessageSquare },
  { id: "tutors", label: "Tutors", icon: UserRoundCheck },
  { id: "parentPortal", label: "Parent Portal", icon: UsersRound },
] satisfies Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }>;

interface Props {
  children: ReactNode;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: Props) {
  const [dark, setDark] = useState(false);
  const [userName, setUserName] = useState("User");
  const { showWarning, setShowWarning } = useAutoLogout();

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, "users", user.uid);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        setUserName(snap.data().email || user.email || "User");
      } else {
        setUserName(user.email || "User");
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  const activeLabel = tabItems.find((item) => item.id === activeTab)?.label ?? "Overview";

  return (
    <div className={clsx(dark && "dark")}>
      <div className="flex min-h-screen bg-[#f8fbfa] text-[#17211f] dark:bg-[#111816] dark:text-white">
        <aside className="hidden w-72 border-r border-[#dbe7e2] bg-white p-6 dark:border-white/10 dark:bg-[#17211f] lg:block">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#135d54] text-white">
              <BookOpen size={21} aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-semibold tracking-tight">Educor</h1>
              <p className="text-xs text-[#6c7d78] dark:text-white/55">Learning workspace</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition",
                    activeTab === tab.id
                      ? "bg-[#135d54] text-white"
                      : "text-[#52645f] hover:bg-[#eef7f4] dark:text-white/70 dark:hover:bg-white/10"
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <button
            onClick={() => setDark((value) => !value)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-[#dbe7e2] px-4 py-3 text-sm font-semibold text-[#52645f] transition hover:border-[#135d54] hover:text-[#135d54] dark:border-white/10 dark:text-white/70"
          >
            {dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          <div className="mb-6 rounded-lg border border-[#dbe7e2] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[#6c7d78] dark:text-white/55">Workspace</p>
                <h2 className="text-xl font-semibold">{activeLabel}</h2>
              </div>

              <div className="flex items-center gap-3">
                <NotificationCentre />
                <span className="hidden text-sm text-[#52645f] dark:text-white/70 sm:block">{userName}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d85435] font-semibold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full bg-[#fff1ec] px-4 py-2 text-sm font-semibold text-[#9d321f] transition hover:bg-[#ffd8c9]"
                >
                  <LogOut size={16} aria-hidden="true" />
                  Logout
                </button>
              </div>
            </div>

            <nav className="mt-4 grid grid-cols-2 gap-2 lg:hidden">
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                      activeTab === tab.id
                        ? "bg-[#135d54] text-white"
                        : "bg-[#eef7f4] text-[#52645f] dark:bg-white/10 dark:text-white/75"
                    )}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {children}
        </main>
      </div>

      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl dark:bg-[#17211f]">
            <h2 className="text-xl font-bold">Session expiring</h2>
            <p className="mt-2 text-[#52645f] dark:text-white/70">You have been inactive. Stay logged in?</p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 rounded-full bg-[#135d54] px-4 py-2 font-semibold text-white"
              >
                Stay
              </button>

              <button
                onClick={handleLogout}
                className="flex-1 rounded-full bg-[#fff1ec] px-4 py-2 font-semibold text-[#9d321f]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
