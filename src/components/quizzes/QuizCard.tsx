import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Edit3, FileQuestion, Shuffle, Trash2, Trophy } from "lucide-react";
import type { Quiz, QuizAttempt, QuizSubmissionValues } from "../../types/quiz";
import QuizTaker from "./QuizTaker";

interface QuizCardProps {
  quiz: Quiz;
  canManage: boolean;
  busy: boolean;
  attempt?: QuizAttempt;
  attempts: QuizAttempt[];
  onEdit: (quiz: Quiz) => void;
  onDelete: (quiz: Quiz) => void;
  onSubmit: (quiz: Quiz, values: QuizSubmissionValues) => Promise<void>;
}

const formatSeconds = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
};

export default function QuizCard({
  quiz,
  canManage,
  busy,
  attempt,
  attempts,
  onEdit,
  onDelete,
  onSubmit,
}: QuizCardProps) {
  const [expanded, setExpanded] = useState(false);
  const totalPoints = useMemo(
    () => quiz.questions.reduce((total, question) => total + question.points, 0),
    [quiz.questions]
  );
  const averageScore = useMemo(() => {
    if (attempts.length === 0) return 0;
    return Math.round(attempts.reduce((total, item) => total + item.percentage, 0) / attempts.length);
  }, [attempts]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl transition hover:shadow-xl dark:border-white/10 dark:bg-white/10"
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#e5f2ef] px-3 py-1 text-xs font-bold uppercase text-[#135d54]">
              {quiz.questions.length} questions
            </span>
            {quiz.randomizeQuestions && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-[#52645f] shadow-sm dark:bg-white/10 dark:text-white/70">
                <Shuffle size={13} aria-hidden="true" />
                Randomized
              </span>
            )}
          </div>
          <h3 className="mt-4 text-xl font-bold tracking-normal">{quiz.title}</h3>
          <p className="mt-3 leading-7 text-[#52645f] dark:text-white/70">{quiz.description}</p>
        </div>

        <div className="grid min-w-44 gap-2 rounded-xl bg-[#eef7f4] p-4 text-[#135d54] dark:bg-white/10 dark:text-white">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Clock size={16} aria-hidden="true" />
            {quiz.timeLimitMinutes} minutes
          </span>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <FileQuestion size={16} aria-hidden="true" />
            {totalPoints} points
          </span>
          {canManage ? (
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Trophy size={16} aria-hidden="true" />
              {attempts.length} attempts
            </span>
          ) : attempt ? (
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Trophy size={16} aria-hidden="true" />
              {attempt.percentage}%
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-full bg-[#135d54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f4942]"
        >
          {expanded ? "Hide details" : canManage ? "View results" : "Open quiz"}
        </button>

        {canManage && (
          <>
            <button
              type="button"
              onClick={() => onEdit(quiz)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-[#ffe8dd] px-4 py-2 text-sm font-semibold text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:opacity-60"
            >
              <Edit3 size={16} aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(quiz)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-[#fff1ec] px-4 py-2 text-sm font-semibold text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:opacity-60"
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </button>
          </>
        )}
      </div>

      {expanded && canManage && (
        <div className="mt-5 space-y-3">
          <div className="rounded-xl bg-[#eef7f4] p-4 text-[#135d54]">
            <p className="font-bold">Class average: {averageScore}%</p>
            <p className="mt-1 text-sm">Essay attempts are saved for review, while objective questions are marked instantly.</p>
          </div>

          {attempts.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-5 text-[#52645f] dark:border-white/15 dark:bg-white/5 dark:text-white/70">
              No student attempts yet.
            </div>
          )}

          {attempts.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="font-semibold text-[#135d54]">{item.studentEmail}</p>
                  <p className="mt-1 text-xs font-bold uppercase text-[#6c7d78] dark:text-white/55">
                    {item.status.replace("_", " ")}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#135d54] shadow-sm dark:bg-white/10 dark:text-white">
                  {item.score}/{item.maxScore} ({item.percentage}%)
                </span>
              </div>
              <p className="mt-3 text-sm text-[#52645f] dark:text-white/65">
                Time spent: {formatSeconds(item.timeSpentSeconds)}
              </p>
            </div>
          ))}
        </div>
      )}

      {expanded && !canManage && <QuizTaker quiz={quiz} attempt={attempt} busy={busy} onSubmit={onSubmit} />}
    </motion.article>
  );
}
