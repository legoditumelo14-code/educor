import { useState } from "react";
import { Check, CheckCircle2, X } from "lucide-react";
import type { Lesson, LessonProgress } from "../../types/lesson";
import LessonResourceList from "./LessonResourceList";

interface LessonViewerProps {
  lesson: Lesson;
  progress?: LessonProgress;
  canTrack: boolean;
  saving: boolean;
  onClose: () => void;
  onProgressChange: (completedSectionIds: string[]) => Promise<void>;
}

export default function LessonViewer({
  lesson,
  progress,
  canTrack,
  saving,
  onClose,
  onProgressChange,
}: LessonViewerProps) {
  const [completedIds, setCompletedIds] = useState<string[]>(progress?.completedSectionIds ?? []);
  const progressPercent = Math.round((completedIds.length / Math.max(lesson.sections.length, 1)) * 100);

  const updateProgress = async (nextIds: string[]) => {
    setCompletedIds(nextIds);
    await onProgressChange(nextIds);
  };

  const toggleSection = async (sectionId: string) => {
    const nextIds = completedIds.includes(sectionId)
      ? completedIds.filter((id) => id !== sectionId)
      : [...completedIds, sectionId];

    await updateProgress(nextIds);
  };

  const markComplete = async () => {
    await updateProgress(lesson.sections.map((section) => section.id));
  };

  return (
    <section className="rounded-2xl border border-white/45 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-semibold uppercase text-[#135d54]">Lesson reader</p>
          <h2 className="mt-2 text-3xl font-bold tracking-normal">{lesson.title}</h2>
          <p className="mt-3 max-w-3xl leading-7 text-[#52645f] dark:text-white/70">{lesson.summary}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-full bg-[#eef7f4] px-4 py-2 text-sm font-semibold text-[#52645f] transition hover:text-[#135d54]"
        >
          <X size={16} aria-hidden="true" />
          Close
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#52645f] dark:text-white/65">Reading progress</p>
            <p className="text-2xl font-bold">{progressPercent}%</p>
          </div>
          {canTrack && (
            <button
              type="button"
              onClick={markComplete}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[#135d54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f4942] disabled:opacity-60"
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              Mark complete
            </button>
          )}
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#dbe7e2] dark:bg-white/10">
          <div className="h-full rounded-full bg-[#d85435]" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {lesson.sections.map((section, index) => {
          const completed = completedIds.includes(section.id);

          return (
            <article key={section.id} className="rounded-xl border border-[#dbe7e2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-semibold uppercase text-[#d85435]">Section {index + 1}</p>
                  <h3 className="mt-2 text-xl font-bold">{section.title}</h3>
                </div>
                {canTrack && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    disabled={saving}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                      completed
                        ? "bg-[#e5f2ef] text-[#135d54]"
                        : "bg-[#eef7f4] text-[#52645f] hover:text-[#135d54]"
                    }`}
                  >
                    <Check size={16} aria-hidden="true" />
                    {completed ? "Completed" : "Mark read"}
                  </button>
                )}
              </div>
              <p className="mt-4 whitespace-pre-wrap leading-8 text-[#34423e] dark:text-white/75">{section.body}</p>
              <LessonResourceList resources={section.resources} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
