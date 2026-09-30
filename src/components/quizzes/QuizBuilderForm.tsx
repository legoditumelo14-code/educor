import { useMemo, useState } from "react";
import { Clock, Loader2, Plus, Save, Shuffle, X } from "lucide-react";
import { createQuizQuestion } from "../../lib/quizzes";
import type { Quiz, QuizFormValues, QuizQuestion } from "../../types/quiz";
import QuizQuestionEditor from "./QuizQuestionEditor";

interface QuizBuilderFormProps {
  initialQuiz?: Quiz | null;
  submitting: boolean;
  onSubmit: (values: QuizFormValues) => Promise<void>;
  onCancel?: () => void;
}

const createInitialValues = (quiz?: Quiz | null): QuizFormValues => ({
  title: quiz?.title ?? "",
  description: quiz?.description ?? "",
  timeLimitMinutes: quiz?.timeLimitMinutes ?? 15,
  randomizeQuestions: quiz?.randomizeQuestions ?? false,
  questions: quiz?.questions.length ? quiz.questions : [createQuizQuestion()],
});

const validateQuestion = (question: QuizQuestion) => {
  if (!question.prompt.trim()) return "Each question needs a prompt.";
  if (!Number.isFinite(question.points) || question.points <= 0) return "Each question needs positive points.";

  if (question.type === "multiple_choice") {
    if (question.options.length < 2 || question.options.some((option) => !option.text.trim())) {
      return "Multiple choice questions need at least two complete options.";
    }

    if (!question.options.some((option) => option.isCorrect)) {
      return "Multiple choice questions need one correct option.";
    }
  }

  if (question.type === "short_answer" && !question.correctAnswer.trim()) {
    return "Short answer questions need an auto-mark answer.";
  }

  if (question.type === "matching" && question.pairs.some((pair) => !pair.prompt.trim() || !pair.answer.trim())) {
    return "Matching questions need complete prompt and answer pairs.";
  }

  return "";
};

export default function QuizBuilderForm({ initialQuiz, submitting, onSubmit, onCancel }: QuizBuilderFormProps) {
  const [values, setValues] = useState<QuizFormValues>(() => createInitialValues(initialQuiz));
  const [error, setError] = useState("");

  const totalPoints = useMemo(
    () => values.questions.reduce((total, question) => total + (Number.isFinite(question.points) ? question.points : 0), 0),
    [values.questions]
  );

  const updateValue = <K extends keyof QuizFormValues>(key: K, value: QuizFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const updateQuestion = (questionId: string, question: QuizQuestion) => {
    updateValue(
      "questions",
      values.questions.map((item) => (item.id === questionId ? question : item))
    );
  };

  const moveQuestion = (questionId: string, direction: "up" | "down") => {
    const currentIndex = values.questions.findIndex((question) => question.id === questionId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= values.questions.length) return;

    const nextQuestions = [...values.questions];
    [nextQuestions[currentIndex], nextQuestions[targetIndex]] = [nextQuestions[targetIndex], nextQuestions[currentIndex]];
    updateValue("questions", nextQuestions);
  };

  const submitForm = async () => {
    setError("");

    if (!values.title.trim() || !values.description.trim()) {
      setError("Add a title and description before saving.");
      return;
    }

    if (!Number.isFinite(values.timeLimitMinutes) || values.timeLimitMinutes < 1) {
      setError("Time limit must be at least 1 minute.");
      return;
    }

    const questionError = values.questions.map(validateQuestion).find(Boolean);
    if (questionError) {
      setError(questionError);
      return;
    }

    await onSubmit({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      timeLimitMinutes: Number(values.timeLimitMinutes),
      questions: values.questions.map((question) => ({
        ...question,
        prompt: question.prompt.trim(),
        correctAnswer: question.correctAnswer.trim(),
        points: Number(question.points),
        options: question.options.map((option) => ({ ...option, text: option.text.trim() })),
        pairs: question.pairs.map((pair) => ({
          ...pair,
          prompt: pair.prompt.trim(),
          answer: pair.answer.trim(),
        })),
      })),
    });

    if (!initialQuiz) {
      setValues(createInitialValues());
    }
  };

  return (
    <section className="rounded-2xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-semibold uppercase text-[#d85435]">Interactive builder</p>
          <h2 className="mt-2 text-2xl font-bold">{initialQuiz ? "Edit quiz" : "Create quiz"}</h2>
          <p className="mt-2 max-w-3xl leading-7 text-[#52645f] dark:text-white/65">
            Build timed assessments with objective auto-marking, richer written answers, randomized delivery, and saved scores.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-full bg-[#eef7f4] px-4 py-2 text-sm font-semibold text-[#52645f] transition hover:text-[#135d54]"
          >
            <X size={16} aria-hidden="true" />
            Cancel editing
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px_220px]">
        <label>
          <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Title</span>
          <input
            value={values.title}
            onChange={(event) => updateValue("title", event.target.value)}
            placeholder="Example: Photosynthesis quick check"
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Time limit</span>
          <div className="relative">
            <Clock className="absolute left-3 top-3 text-[#78918a]" size={18} aria-hidden="true" />
            <input
              type="number"
              min={1}
              value={values.timeLimitMinutes}
              onChange={(event) => updateValue("timeLimitMinutes", Number(event.target.value))}
              className="w-full rounded-lg border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
            />
          </div>
        </label>

        <label className="flex items-end">
          <span className="inline-flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f]">
            <span className="inline-flex items-center gap-2 font-semibold">
              <Shuffle size={18} aria-hidden="true" />
              Randomize
            </span>
            <input
              type="checkbox"
              checked={values.randomizeQuestions}
              onChange={(event) => updateValue("randomizeQuestions", event.target.checked)}
              className="h-5 w-5 accent-[#135d54]"
            />
          </span>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Description</span>
        <textarea
          value={values.description}
          onChange={(event) => updateValue("description", event.target.value)}
          placeholder="Describe what students should expect."
          className="min-h-28 w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
      </label>

      <div className="mt-5 flex flex-col gap-3 rounded-xl bg-[#eef7f4] p-4 text-[#135d54] md:flex-row md:items-center md:justify-between">
        <p className="font-bold">
          {values.questions.length} {values.questions.length === 1 ? "question" : "questions"} - {totalPoints} points
        </p>
        <button
          type="button"
          onClick={() => updateValue("questions", [...values.questions, createQuizQuestion()])}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#135d54] shadow-sm"
        >
          <Plus size={16} aria-hidden="true" />
          Add question
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {values.questions.map((question, index) => (
          <QuizQuestionEditor
            key={question.id}
            question={question}
            index={index}
            total={values.questions.length}
            onChange={(nextQuestion) => updateQuestion(question.id, nextQuestion)}
            onRemove={() => updateValue("questions", values.questions.filter((item) => item.id !== question.id))}
            onMove={(direction) => moveQuestion(question.id, direction)}
          />
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-[#fff1ec] px-4 py-3 text-sm text-[#9d321f]">{error}</p>}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={submitForm}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
          {submitting ? "Saving..." : initialQuiz ? "Save changes" : "Create quiz"}
        </button>
      </div>
    </section>
  );
}
