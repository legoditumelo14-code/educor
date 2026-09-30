import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import type { AchievementUnlock } from "../../types/achievement";

interface RewardPopupProps {
  unlocks: AchievementUnlock[];
  onDismiss: () => void;
}

export default function RewardPopup({ unlocks, onDismiss }: RewardPopupProps) {
  return (
    <AnimatePresence>
      {unlocks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/35 bg-white p-6 text-[#17211f] shadow-2xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(216,84,53,0.18),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(19,93,84,0.18),_transparent_36%)]" />
            <button
              type="button"
              onClick={onDismiss}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-[#52645f] shadow-sm"
              aria-label="Close reward popup"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <div className="relative z-10 text-center">
              <motion.div
                initial={{ rotate: -8, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.12, type: "spring", stiffness: 260, damping: 14 }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#135d54] text-white shadow-lg"
              >
                <Sparkles size={38} aria-hidden="true" />
              </motion.div>
              <p className="mt-5 text-sm font-bold uppercase text-[#d85435]">Reward unlocked</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal">Achievement earned</h2>

              <div className="mt-5 grid gap-3">
                {unlocks.map((unlock, index) => (
                  <motion.div
                    key={unlock.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 + index * 0.08 }}
                    className="rounded-xl border border-[#dbe7e2] bg-white/80 p-4 text-left shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">{unlock.title}</p>
                      <span className="rounded-full bg-[#eef7f4] px-3 py-1 text-xs font-bold text-[#135d54]">
                        +{unlock.xp} XP
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[#52645f]">{unlock.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
