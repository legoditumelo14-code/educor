import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, BookOpenCheck, FileText, RefreshCw, Sparkles } from "lucide-react";
import { auth } from "../../lib/firebase";
import {
  createLesson,
  deleteLesson,
  getLessonProgress,
  getLessons,
  publishLesson,
  saveLessonProgress,
  updateLesson,
} from "../../lib/lessons";
import type { Lesson, LessonFormValues, LessonProgress } from "../../types/lesson";
import LessonCard from "./LessonCard";
import LessonForm from "./LessonForm";
import LessonState from "./LessonState";
import LessonViewer from "./LessonViewer";

interface LessonBuilderModuleProps {
  role: "student" | "teacher" | null;
  onLessonsLoaded?: (count: number) => void;
}

const skeletonCards = Array.from({ length: 6 }, (_, index) => index);

export default function LessonBuilderModule({ role, onLessonsLoaded }: LessonBuilderModuleProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, LessonProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyLessonId, setBusyLessonId] = useState("");
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);

  const canManage = role === "teacher";
  const canTrack = role === "student";

  const visibleLessons = useMemo(() => {
    if (canManage) return lessons;
    return lessons.filter((lesson) => lesson.status === "published");
  }, [canManage, lessons]);

  const draftCount = useMemo(() => lessons.filter((lesson) => lesson.status === "draft").length, [lessons]);
  const publishedCount = useMemo(() => lessons.filter((lesson) => lesson.status === "published").length, [lessons]);
  const completedCount = useMemo(
    () => Object.values(progressMap).filter((progress) => progress.completed).length,
    [progressMap]
  );

  const loadLessons = async () => {
    setError("");
    setLoading(true);

    try {
      const lessonData = await getLessons();
      setLessons(lessonData);
      onLessonsLoaded?.(lessonData.length);

      const user = auth.currentUser;
      if (user) {
        setProgressMap(await getLessonProgress(user.uid));
      }
    } catch {
      setError("Lessons could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialLessons = async () => {
      try {
        const lessonData = await getLessons();
        if (!mounted) return;

        setLessons(lessonData);
        onLessonsLoaded?.(lessonData.length);

        const user = auth.currentUser;
        if (user) {
          const progressData = await getLessonProgress(user.uid);
          if (mounted) {
            setProgressMap(progressData);
          }
        }
      } catch {
        if (mounted) {
          setError("Lessons could not be loaded. Check your connection and try again.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialLessons();

    return () => {
      mounted = false;
    };
  }, [onLessonsLoaded]);

  const refreshLessons = async () => {
    const lessonData = await getLessons();
    setLessons(lessonData);
    onLessonsLoaded?.(lessonData.length);
    return lessonData;
  };

  const handleCreate = async (values: LessonFormValues) => {
    const user = auth.currentUser;
    setActionError("");

    if (!user || !canManage) {
      setActionError("Only logged-in teachers can create lessons.");
      return;
    }

    setSubmitting(true);
    try {
      await createLesson(values, {
        uid: user.uid,
        email: user.email || "Educor teacher",
      });
      await refreshLessons();
    } catch {
      setActionError("The lesson could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (values: LessonFormValues) => {
    if (!editingLesson) return;
    setActionError("");
    setSubmitting(true);

    try {
      await updateLesson(editingLesson, values);
      const updatedLessons = await refreshLessons();
      setEditingLesson(null);
      if (selectedLesson?.id === editingLesson.id) {
        setSelectedLesson(updatedLessons.find((lesson) => lesson.id === editingLesson.id) ?? null);
      }
    } catch {
      setActionError("The lesson could not be updated. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (lesson: Lesson) => {
    if (!window.confirm(`Delete "${lesson.title}"? This will remove the lesson and its uploaded files.`)) return;

    setActionError("");
    setBusyLessonId(lesson.id);

    try {
      await deleteLesson(lesson);
      await refreshLessons();
      if (editingLesson?.id === lesson.id) setEditingLesson(null);
      if (selectedLesson?.id === lesson.id) setSelectedLesson(null);
    } catch {
      setActionError("The lesson could not be deleted. Please try again.");
    } finally {
      setBusyLessonId("");
    }
  };

  const handlePublish = async (lesson: Lesson) => {
    setActionError("");
    setBusyLessonId(lesson.id);

    try {
      await publishLesson(lesson);
      await refreshLessons();
    } catch {
      setActionError("The lesson could not be published. Please try again.");
    } finally {
      setBusyLessonId("");
    }
  };

  const handleProgressChange = async (lesson: Lesson, completedSectionIds: string[]) => {
    const user = auth.currentUser;
    if (!user) return;

    setSavingProgress(true);
    setActionError("");

    try {
      const progress = await saveLessonProgress(lesson, user.uid, completedSectionIds);
      setProgressMap((current) => ({ ...current, [lesson.id]: progress }));
    } catch {
      setActionError("Reading progress could not be saved. Please try again.");
    } finally {
      setSavingProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#17211f] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(216,84,53,0.42),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.18),_transparent_30%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Lesson Builder
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              {canManage ? "Build rich lessons with drafts, files, and sections." : "Read lessons and keep progress visible."}
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/78">
              Teachers can create structured lessons, attach PDFs, videos, and images, then publish when ready. Students get a focused reader with section completion and progress tracking.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "Published", value: publishedCount },
              { label: "Drafts", value: draftCount },
              { label: canTrack ? "Completed" : "Sections", value: canTrack ? completedCount : lessons.reduce((total, lesson) => total + lesson.sections.length, 0) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/20 bg-white/15 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/60">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {canManage && (
        <LessonForm
          key={editingLesson?.id ?? "new-lesson"}
          initialLesson={editingLesson}
          submitting={submitting}
          onSubmit={editingLesson ? handleUpdate : handleCreate}
          onCancel={editingLesson ? () => setEditingLesson(null) : undefined}
        />
      )}

      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-[#9d321f]">
          <AlertCircle className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
          <p className="font-semibold">{actionError}</p>
        </div>
      )}

      {selectedLesson && (
        <LessonViewer
          key={selectedLesson.id}
          lesson={selectedLesson}
          progress={progressMap[selectedLesson.id]}
          canTrack={canTrack}
          saving={savingProgress}
          onClose={() => setSelectedLesson(null)}
          onProgressChange={(completedSectionIds) => handleProgressChange(selectedLesson, completedSectionIds)}
        />
      )}

      {error && (
        <LessonState
          icon={RefreshCw}
          title="Lessons did not load"
          message={error}
          actionLabel="Try again"
          onAction={loadLessons}
        />
      )}

      {loading && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {skeletonCards.map((item) => (
            <div
              key={item}
              className="h-80 animate-pulse rounded-xl border border-white/45 bg-white/60 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
            >
              <div className="space-y-3 p-5">
                <div className="h-7 w-28 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="h-8 w-3/4 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="h-4 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="h-4 w-5/6 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="mt-8 h-24 rounded-xl bg-[#dbe7e2] dark:bg-white/10" />
              </div>
            </div>
          ))}
        </section>
      )}

      {!loading && !error && visibleLessons.length === 0 && (
        <LessonState
          icon={FileText}
          title={canManage ? "Create your first lesson" : "No published lessons yet"}
          message={
            canManage
              ? "Use the builder above to add sections, attach resources, and save a draft or publish for students."
              : "Teachers can publish lessons from the builder. Published lessons will appear here with reading progress."
          }
        />
      )}

      {!loading && !error && visibleLessons.length > 0 && (
        <motion.section layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {visibleLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                progress={progressMap[lesson.id]}
                canManage={canManage}
                busy={busyLessonId === lesson.id || submitting}
                onView={setSelectedLesson}
                onEdit={setEditingLesson}
                onDelete={handleDelete}
                onPublish={handlePublish}
              />
            ))}
          </AnimatePresence>
        </motion.section>
      )}

      {!loading && !error && visibleLessons.length > 0 && (
        <section className="rounded-xl border border-white/45 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
              <BookOpenCheck size={22} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold">Lesson quality loop</h3>
              <p className="mt-1 leading-7 text-[#52645f] dark:text-white/70">
                Drafts protect unfinished work, publishing controls student access, and progress data helps Educor prove engagement.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
