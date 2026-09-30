import type { LucideIcon } from "lucide-react";

interface MessagingStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function MessagingState({ icon: Icon, title, message, actionLabel, onAction }: MessagingStateProps) {
  return (
    <section className="rounded-xl border border-white/45 bg-white/75 p-6 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
        <Icon size={26} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl leading-7 text-[#52645f] dark:text-white/65">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942]"
        >
          {actionLabel}
        </button>
      )}
    </section>
  );
}
