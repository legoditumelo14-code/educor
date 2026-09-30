import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, BrainCircuit, FileQuestion, RefreshCw, Search, SearchX, Sparkles, Trophy } from "lucide-react";
import { auth } from "../../lib/firebase";
import {
  createQuiz,
  deleteQuiz,
  getAllQuizAttempts,
  getQuizAttemptsForStudent,
  getQuizzes,
  submitQuizAttempt,
  updateQuiz,
} from "../../lib/quizzes";
import type { Quiz, QuizAttempt, QuizFormValues, QuizSubmissionValues } from "../../types/quiz";
import QuizBuilderForm from "./QuizBuilderForm";
import QuizCard from "./QuizCard";
import QuizState from "./QuizState";

interface QuizBuilderModuleProps {
  role: "student" | "teacher" | null;
  onQuizzesLoaded?: (count: number) => void;
}

const skeletonCards = Array.from({ length: 4 }, (_, index) => index);

export default function QuizBuilderModule({ role, onQuizzesLoaded }: QuizBuilderModuleProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [studentAttempts, setStudentAttempts] = useState<Record<string, QuizAttempt>>({});
  const [allAttempts, setAllAttempts] = useState<QuizAttempt[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const canManage = role === "teacher";

  const attemptsByQuiz = useMemo(
    () =>
      allAttempts.reduce<Record<string, QuizAttempt[]>>((attemptMap, attempt) => {
        attemptMap[attempt.quizId] = [...(attemptMap[attempt.quizId] ?? []), attempt];
        return attemptMap;
      }, {}),
    [allAttempts]
  );

  const filteredQuizzes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return quizzes;

    return quizzes.filter((quiz) =>
      [quiz.title, quiz.description, quiz.teacherEmail]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [quizzes, search]);

  const totalQuestions = useMemo(
    () => quizzes.reduce((total, quiz) => total + quiz.questions.length, 0),
    [quizzes]
  );
  const savedScores = canManage
    ? allAttempts.length
    : Object.keys(studentAttempts).length;
  const averageScore = useMemo(() => {
    const attempts = canManage ? allAttempts : Object.values(studentAttempts);
    if (attempts.length === 0) return 0;
    return Math.round(attempts.reduce((total, attempt) => total + attempt.percentage, 0) / attempts.length);
  }, [allAttempts, canManage, studentAttempts]);

  const refreshQuizzes = async () => {
    const quizData = await getQuizzes();
    setQuizzes(quizData);
    onQuizzesLoaded?.(quizData.length);
    return quizData;
  };

  const refreshAttempts = async () => {
    const user = auth.currentUser;

    if (canManage) {
      setAllAttempts(await getAllQuizAttempts());
    } else if (user) {
      setStudentAttempts(await getQuizAttemptsForStudent(user.uid));
    }
  };

  const loadQuizzes = async () => {
    setError("");
    setLoading(true);

    try {
      await refreshQuizzes();
      await refreshAttempts();
    } catch {
      setError("Quizzes could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialQuizzes = async () => {
      try {
        const quizData = await getQuizzes();
        if (!mounted) return;

        setQuizzes(quizData);
        onQuizzesLoaded?.(quizData.length);

        const user = auth.currentUser;
        if (role === "teacher") {
          const attemptData = await getAllQuizAttempts();
          if (mounted) setAllAttempts(attemptData);
        } else if (user) {
          const attemptData = await getQuizAttemptsForStudent(user.uid);
          if (mounted) setStudentAttempts(attemptData);
        }
      } catch {
        if (mounted) setError("Quizzes could not be loaded. Check your connection and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialQuizzes();

    return () => {
      mounted = false;
    };
  }, [onQuizzesLoaded, role]);

  const handleCreate = async (values: QuizFormValues) => {
    const user = auth.currentUser;
    setActionError("");

    if (!user || !canManage) {
      setActionError("Only logged-in teachers can create quizzes.");
      return;
    }

    setSubmitting(true);
    try {
      await createQuiz(values, {
        uid: user.uid,
        email: user.email || "Educor teacher",
      });
      await refreshQuizzes();
    } catch {
      setActionError("The quiz could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (values: QuizFormValues) => {
    if (!editingQuiz) return;
    setActionError("");
    setSubmitting(true);

    try {
      await updateQuiz(editingQuiz, values);
      setEditingQuiz(null);
      await refreshQuizzes();
    } catch {
      setActionError("The quiz could not be updated. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (quiz: Quiz) => {
    if (!window.confirm(`Delete "${quiz.title}" and all saved attempts?`)) return;

    setActionError("");
    setBusyId(quiz.id);

    try {
      await deleteQuiz(quiz);
      if (editingQuiz?.id === quiz.id) setEditingQuiz(null);
      await refreshQuizzes();
      await refreshAttempts();
    } catch {
      setActionError("The quiz could not be deleted. Please try again.");
    } finally {
      setBusyId("");
    }
  };

  const handleSubmitAttempt = async (quiz: Quiz, values: QuizSubmissionValues) => {
    const user = auth.currentUser;
    if (!user) return;

    setActionError("");
    setBusyId(quiz.id);

    try {
      await submitQuizAttempt(quiz, values, {
        uid: user.uid,
        email: user.email || "Educor student",
      });
      await refreshAttempts();
    } catch {
      setActionError("Your quiz score could not be saved. Please try again.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#135d54] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(216,84,53,0.36),_transparent_34%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Quiz Builder
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              {canManage ? "Build adaptive checks that mark themselves." : "Take timed quizzes and see saved scores."}
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              Multiple choice, true/false, short answer, essay, and matching questions live in one polished assessment workflow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "Quizzes", value: quizzes.length },
              { label: "Questions", value: totalQuestions },
              { label: canManage ? "Attempts" : "Average", value: canManage ? savedScores : `${averageScore}%` },
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
        <QuizBuilderForm
          key={editingQuiz?.id ?? "new-quiz"}
          initialQuiz={editingQuiz}
          submitting={submitting}
          onSubmit={editingQuiz ? handleUpdate : handleCreate}
          onCancel={editingQuiz ? () => setEditingQuiz(null) : undefined}
        />
      )}

      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-[#9d321f]">
          <AlertCircle className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
          <p className="font-semibold">{actionError}</p>
        </div>
      )}

      <section className="rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <label className="relative block">
            <span className="sr-only">Search quizzes</span>
            <Search className="absolute left-3 top-3 text-[#78918a]" size={18} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search quizzes by title, teacher, or description"
              className="w-full rounded-lg border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
            />
          </label>
          <div className="rounded-lg bg-[#eef7f4] px-4 py-3 text-center text-sm font-semibold text-[#135d54]">
            {filteredQuizzes.length} {filteredQuizzes.length === 1 ? "quiz" : "quizzes"}
          </div>
        </div>
      </section>

      {error && (
        <QuizState
          icon={RefreshCw}
          title="Quizzes did not load"
          message={error}
          actionLabel="Try again"
          onAction={loadQuizzes}
        />
      )}

      {loading && (
        <section className="grid gap-4 xl:grid-cols-2">
          {skeletonCards.map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-2xl border border-white/45 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
            >
              <div className="h-7 w-32 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
              <div className="mt-5 h-8 w-3/4 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
              <div className="mt-4 h-4 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
              <div className="mt-3 h-4 w-5/6 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
              <div className="mt-8 h-20 rounded-xl bg-[#dbe7e2] dark:bg-white/10" />
            </div>
          ))}
        </section>
      )}

      {!loading && !error && quizzes.length === 0 && (
        <QuizState
          icon={BrainCircuit}
          title={canManage ? "Create the first quiz" : "No quizzes yet"}
          message={
            canManage
              ? "Use the builder above to create a timed quiz with auto-marked objective questions."
              : "Teacher-created quizzes will appear here when they are ready."
          }
        />
      )}

      {!loading && !error && quizzes.length > 0 && filteredQuizzes.length === 0 && (
        <QuizState
          icon={SearchX}
          title="No quizzes match your search"
          message="Try a broader search term to bring more quizzes back into view."
          actionLabel="Clear search"
          onAction={() => setSearch("")}
        />
      )}

      {!loading && !error && filteredQuizzes.length > 0 && (
        <motion.section layout className="grid gap-4 xl:grid-cols-2">
          <AnimatePresence>
            {filteredQuizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                canManage={canManage}
                busy={busyId === quiz.id || submitting}
                attempt={studentAttempts[quiz.id]}
                attempts={attemptsByQuiz[quiz.id] ?? []}
                onEdit={setEditingQuiz}
                onDelete={handleDelete}
                onSubmit={handleSubmitAttempt}
              />
            ))}
          </AnimatePresence>
        </motion.section>
      )}

      {!loading && !error && filteredQuizzes.length > 0 && (
        <section className="rounded-xl border border-white/45 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
              {canManage ? <FileQuestion size={22} aria-hidden="true" /> : <Trophy size={22} aria-hidden="true" />}
            </div>
            <div>
              <h3 className="font-bold">{canManage ? "Assessment loop" : "Saved scores"}</h3>
              <p className="mt-1 leading-7 text-[#52645f] dark:text-white/70">
                {canManage
                  ? "Fast quiz creation and instant objective scoring help teachers check understanding without adding admin drag."
                  : "Your submitted quiz scores are saved automatically, with essay answers kept for review when needed."}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
