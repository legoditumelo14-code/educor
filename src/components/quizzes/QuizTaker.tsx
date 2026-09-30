import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Loader2, Play, Send } from "lucide-react";
import { shuffleQuestions } from "../../lib/quizzes";
import type { Quiz, QuizAnswer, QuizAttempt, QuizSubmissionValues } from "../../types/quiz";

interface QuizTakerProps {
  quiz: Quiz;
  attempt?: QuizAttempt;
  busy: boolean;
  onSubmit: (quiz: Quiz, values: QuizSubmissionValues) => Promise<void>;
}

type AnswerDraft = Pick<QuizAnswer, "selectedOptionId" | "responseText" | "matchingAnswers">;

const createEmptyAnswers = (quiz: Quiz) =>
  quiz.questions.reduce<Record<string, AnswerDraft>>((answerMap, question) => {
    answerMap[question.id] = {
      selectedOptionId: "",
      responseText: "",
      matchingAnswers: {},
    };
    return answerMap;
  }, {});

const formatSeconds = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

export default function QuizTaker({ quiz, attempt, busy, onSubmit }: QuizTakerProps) {
  const [started, setStarted] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(quiz.timeLimitMinutes * 60);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>(() => createEmptyAnswers(quiz));
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const questions = useMemo(
    () => (quiz.randomizeQuestions && started ? shuffleQuestions(quiz.questions) : quiz.questions),
    [quiz.questions, quiz.randomizeQuestions, started]
  );

  const updateAnswer = (questionId: string, patch: Partial<AnswerDraft>) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        ...(current[questionId] ?? { selectedOptionId: "", responseText: "", matchingAnswers: {} }),
        ...patch,
      },
    }));
  };

  const startQuiz = () => {
    setStarted(true);
    setStartedAtMs(Date.now());
    setRemainingSeconds(quiz.timeLimitMinutes * 60);
    setAnswers(createEmptyAnswers(quiz));
    setHasSubmitted(false);
  };

  const submitQuiz = useCallback(async () => {
    if (busy || hasSubmitted || !startedAtMs) return;

    setHasSubmitted(true);
    await onSubmit(quiz, {
      startedAtMs,
      timeSpentSeconds: Math.max(0, Math.round((Date.now() - startedAtMs) / 1000)),
      answers,
    });
    setStarted(false);
  }, [answers, busy, hasSubmitted, onSubmit, quiz, startedAtMs]);

  useEffect(() => {
    if (!started || hasSubmitted || !startedAtMs) return undefined;

    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
      const nextRemaining = Math.max(quiz.timeLimitMinutes * 60 - elapsedSeconds, 0);
      setRemainingSeconds(nextRemaining);

      if (nextRemaining === 0) {
        window.clearInterval(timer);
        void submitQuiz();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [hasSubmitted, quiz.timeLimitMinutes, started, startedAtMs, submitQuiz]);

  if (!started) {
    return (
      <div className="mt-5 rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5">
        {attempt && (
          <div className="mb-4 rounded-lg bg-[#eef7f4] p-4 text-[#135d54]">
            <p className="font-bold">
              Last score: {attempt.score}/{attempt.maxScore} ({attempt.percentage}%)
            </p>
            <p className="mt-1 text-sm">
              {attempt.status === "needs_review"
                ? "Objective questions were marked. Essay answers are saved for review."
                : "Your score was saved."}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={startQuiz}
          className="inline-flex items-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942]"
        >
          <Play size={18} aria-hidden="true" />
          {attempt ? "Retake quiz" : "Start quiz"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5">
      <div className="sticky top-4 z-10 mb-4 flex flex-col gap-3 rounded-xl border border-white/45 bg-white/90 p-4 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-[#17211f]/90">
        <div>
          <p className="text-xs font-bold uppercase text-[#d85435]">In progress</p>
          <p className="mt-1 font-semibold">{quiz.title}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#eef7f4] px-4 py-2 font-bold text-[#135d54]">
          <Clock size={18} aria-hidden="true" />
          {formatSeconds(remainingSeconds)}
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <article key={question.id} className="rounded-xl bg-white p-4 shadow-sm dark:bg-white/10">
            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-bold uppercase text-[#6c7d78] dark:text-white/55">
                  Question {index + 1} - {question.points} points
                </p>
                <h3 className="mt-2 font-bold">{question.prompt}</h3>
              </div>
              <span className="rounded-full bg-[#eef7f4] px-3 py-1 text-xs font-bold uppercase text-[#135d54]">
                {question.type.replace("_", " ")}
              </span>
            </div>

            {(question.type === "multiple_choice" || question.type === "true_false") && (
              <div className="mt-4 grid gap-2">
                {question.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#dbe7e2] bg-[#f8fbfa] p-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id]?.selectedOptionId === option.id}
                      onChange={() => updateAnswer(question.id, { selectedOptionId: option.id })}
                      className="h-4 w-4 accent-[#135d54]"
                    />
                    <span className="font-semibold text-[#34423e] dark:text-white/80">{option.text}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === "short_answer" && (
              <input
                value={answers[question.id]?.responseText ?? ""}
                onChange={(event) => updateAnswer(question.id, { responseText: event.target.value })}
                placeholder="Type your answer"
                className="mt-4 w-full rounded-lg border border-[#c9ded8] bg-white px-4 py-3 text-[#17211f] outline-none focus:border-[#135d54]"
              />
            )}

            {question.type === "essay" && (
              <textarea
                value={answers[question.id]?.responseText ?? ""}
                onChange={(event) => updateAnswer(question.id, { responseText: event.target.value })}
                placeholder="Write your response"
                className="mt-4 min-h-36 w-full rounded-lg border border-[#c9ded8] bg-white px-4 py-3 text-[#17211f] outline-none focus:border-[#135d54]"
              />
            )}

            {question.type === "matching" && (
              <div className="mt-4 grid gap-2">
                {question.pairs.map((pair) => (
                  <label key={pair.id} className="grid gap-2 md:grid-cols-[1fr_1fr] md:items-center">
                    <span className="rounded-lg bg-[#eef7f4] px-4 py-3 font-semibold text-[#135d54]">
                      {pair.prompt}
                    </span>
                    <input
                      value={answers[question.id]?.matchingAnswers[pair.id] ?? ""}
                      onChange={(event) =>
                        updateAnswer(question.id, {
                          matchingAnswers: {
                            ...(answers[question.id]?.matchingAnswers ?? {}),
                            [pair.id]: event.target.value,
                          },
                        })
                      }
                      placeholder="Matching answer"
                      className="rounded-lg border border-[#c9ded8] bg-white px-4 py-3 text-[#17211f] outline-none focus:border-[#135d54]"
                    />
                  </label>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => void submitQuiz()}
          disabled={busy || hasSubmitted}
          className="inline-flex items-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942] disabled:opacity-60"
        >
          {busy || hasSubmitted ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
          Submit quiz
        </button>
      </div>
    </div>
  );
}
