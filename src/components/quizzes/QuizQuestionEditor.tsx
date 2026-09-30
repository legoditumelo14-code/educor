import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { createQuizQuestion } from "../../lib/quizzes";
import { QUIZ_QUESTION_TYPES, type QuizOption, type QuizQuestion, type QuizQuestionType } from "../../types/quiz";

interface QuizQuestionEditorProps {
  question: QuizQuestion;
  index: number;
  total: number;
  onChange: (question: QuizQuestion) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}

const questionTypeLabels: Record<QuizQuestionType, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True/False",
  short_answer: "Short Answer",
  essay: "Essay",
  matching: "Matching",
};

const createOption = (): QuizOption => ({
  id: crypto.randomUUID(),
  text: "New option",
  isCorrect: false,
});

export default function QuizQuestionEditor({
  question,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: QuizQuestionEditorProps) {
  const update = <K extends keyof QuizQuestion>(key: K, value: QuizQuestion[K]) => {
    onChange({ ...question, [key]: value });
  };

  const changeType = (type: QuizQuestionType) => {
    onChange({
      ...createQuizQuestion(type),
      id: question.id,
      prompt: question.prompt,
      points: type === "essay" ? Math.max(question.points, 10) : Math.max(question.points, 1),
    });
  };

  const updateOption = (optionId: string, patch: Partial<QuizOption>) => {
    update(
      "options",
      question.options.map((option) => {
        if (option.id !== optionId) return option;
        return { ...option, ...patch };
      })
    );
  };

  const markCorrectOption = (optionId: string) => {
    update(
      "options",
      question.options.map((option) => ({ ...option, isCorrect: option.id === optionId }))
    );
  };

  const updatePair = (pairId: string, patch: Partial<QuizQuestion["pairs"][number]>) => {
    update(
      "pairs",
      question.pairs.map((pair) => (pair.id === pairId ? { ...pair, ...patch } : pair))
    );
  };

  return (
    <article className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-bold uppercase text-[#d85435]">Question {index + 1}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onMove("up")}
              disabled={index === 0}
              className="rounded-full bg-white p-2 text-[#52645f] shadow-sm transition hover:text-[#135d54] disabled:opacity-40 dark:bg-white/10"
              aria-label="Move question up"
            >
              <ArrowUp size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onMove("down")}
              disabled={index === total - 1}
              className="rounded-full bg-white p-2 text-[#52645f] shadow-sm transition hover:text-[#135d54] disabled:opacity-40 dark:bg-white/10"
              aria-label="Move question down"
            >
              <ArrowDown size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={total === 1}
              className="rounded-full bg-[#fff1ec] p-2 text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:opacity-40"
              aria-label="Remove question"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[220px_120px]">
          <label>
            <span className="mb-1 block text-xs font-bold uppercase text-[#6c7d78] dark:text-white/55">Type</span>
            <select
              value={question.type}
              onChange={(event) => changeType(event.target.value as QuizQuestionType)}
              className="w-full rounded-lg border border-[#c9ded8] bg-white px-3 py-2 text-[#17211f] outline-none focus:border-[#135d54]"
            >
              {QUIZ_QUESTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {questionTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-bold uppercase text-[#6c7d78] dark:text-white/55">Points</span>
            <input
              type="number"
              min={1}
              value={question.points}
              onChange={(event) => update("points", Number(event.target.value))}
              className="w-full rounded-lg border border-[#c9ded8] bg-white px-3 py-2 text-[#17211f] outline-none focus:border-[#135d54]"
            />
          </label>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Prompt</span>
        <textarea
          value={question.prompt}
          onChange={(event) => update("prompt", event.target.value)}
          placeholder="Ask a focused question."
          className="min-h-24 w-full rounded-lg border border-[#c9ded8] bg-white px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
        />
      </label>

      {question.type === "multiple_choice" && (
        <div className="mt-4 space-y-2">
          {question.options.map((option) => (
            <div key={option.id} className="grid gap-2 md:grid-cols-[auto_1fr_auto] md:items-center">
              <button
                type="button"
                onClick={() => markCorrectOption(option.id)}
                className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-bold ${
                  option.isCorrect ? "bg-[#135d54] text-white" : "bg-white text-[#52645f]"
                }`}
              >
                <Check size={14} aria-hidden="true" />
              </button>
              <input
                value={option.text}
                onChange={(event) => updateOption(option.id, { text: event.target.value })}
                className="rounded-lg border border-[#c9ded8] bg-white px-3 py-2 text-[#17211f] outline-none focus:border-[#135d54]"
              />
              <button
                type="button"
                onClick={() => update("options", question.options.filter((item) => item.id !== option.id))}
                disabled={question.options.length <= 2}
                className="rounded-full bg-[#fff1ec] p-2 text-[#9d321f] disabled:opacity-40"
                aria-label="Remove option"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update("options", [...question.options, createOption()])}
            className="inline-flex items-center gap-2 rounded-full bg-[#eef7f4] px-4 py-2 text-sm font-semibold text-[#135d54]"
          >
            <Plus size={16} aria-hidden="true" />
            Add option
          </button>
        </div>
      )}

      {question.type === "true_false" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {question.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => markCorrectOption(option.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                option.isCorrect ? "bg-[#135d54] text-white" : "bg-white text-[#52645f]"
              }`}
            >
              {option.text}
            </button>
          ))}
        </div>
      )}

      {question.type === "short_answer" && (
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-[#34423e] dark:text-white/80">Auto-mark answer</span>
          <input
            value={question.correctAnswer}
            onChange={(event) => update("correctAnswer", event.target.value)}
            placeholder="Exact answer for automatic marking"
            className="w-full rounded-lg border border-[#c9ded8] bg-white px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>
      )}

      {question.type === "matching" && (
        <div className="mt-4 space-y-2">
          {question.pairs.map((pair) => (
            <div key={pair.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={pair.prompt}
                onChange={(event) => updatePair(pair.id, { prompt: event.target.value })}
                placeholder="Prompt"
                className="rounded-lg border border-[#c9ded8] bg-white px-3 py-2 text-[#17211f] outline-none focus:border-[#135d54]"
              />
              <input
                value={pair.answer}
                onChange={(event) => updatePair(pair.id, { answer: event.target.value })}
                placeholder="Matching answer"
                className="rounded-lg border border-[#c9ded8] bg-white px-3 py-2 text-[#17211f] outline-none focus:border-[#135d54]"
              />
              <button
                type="button"
                onClick={() => update("pairs", question.pairs.filter((item) => item.id !== pair.id))}
                disabled={question.pairs.length <= 1}
                className="rounded-full bg-[#fff1ec] p-2 text-[#9d321f] disabled:opacity-40"
                aria-label="Remove pair"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update("pairs", [...question.pairs, { id: crypto.randomUUID(), prompt: "", answer: "" }])}
            className="inline-flex items-center gap-2 rounded-full bg-[#eef7f4] px-4 py-2 text-sm font-semibold text-[#135d54]"
          >
            <Plus size={16} aria-hidden="true" />
            Add pair
          </button>
        </div>
      )}
    </article>
  );
}
