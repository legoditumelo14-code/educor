import type { LucideIcon } from "lucide-react";

interface ProgressStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function ProgressState({ icon: Icon, title, message, actionLabel, onAction }: ProgressStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-[#b7d5ce] bg-white/70 p-8 text-center shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54] dark:bg-white/10 dark:text-white">
        <Icon size={28} aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl leading-7 text-[#52645f] dark:text-white/70">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
