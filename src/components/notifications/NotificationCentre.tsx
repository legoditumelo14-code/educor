import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellRing,
  BookOpenCheck,
  CheckCheck,
  ClipboardList,
  Loader2,
  Megaphone,
  Settings,
  Sparkles,
  Trophy,
} from "lucide-react";
import clsx from "clsx";
import { auth } from "../../lib/firebase";
import {
  defaultNotificationSettings,
  markNotificationAsRead,
  markNotificationsAsRead,
  saveNotificationSettings,
  subscribeNotificationCentre,
} from "../../lib/notifications";
import type { NotificationCentreData, NotificationItem, NotificationSettings, NotificationType } from "../../types/notification";

const notificationIcons: Record<NotificationType, typeof Bell> = {
  announcement: Megaphone,
  assignment_reminder: ClipboardList,
  quiz_reminder: Trophy,
  course_update: BookOpenCheck,
};

const notificationStyles: Record<NotificationType, string> = {
  announcement: "bg-[#edf5fb] text-[#2f6f9f]",
  assignment_reminder: "bg-[#fff1ec] text-[#9d321f]",
  quiz_reminder: "bg-[#f7edf9] text-[#7a3d8a]",
  course_update: "bg-[#eef7f4] text-[#135d54]",
};

const settingRows: Array<{
  key: keyof NotificationSettings;
  label: string;
  description: string;
}> = [
  {
    key: "announcements",
    label: "Announcements",
    description: "School and classroom updates",
  },
  {
    key: "assignmentReminders",
    label: "Assignment reminders",
    description: "Upcoming due dates",
  },
  {
    key: "quizReminders",
    label: "Quiz reminders",
    description: "Available quizzes",
  },
  {
    key: "courseUpdates",
    label: "Course updates",
    description: "New course activity",
  },
];

const formatTime = (millis: number) => {
  if (!millis) return "Recently";

  const diffMs = Date.now() - millis;
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) return `${Math.max(Math.round(diffMs / minuteMs), 1)}m ago`;
  if (diffMs < dayMs) return `${Math.round(diffMs / hourMs)}h ago`;

  return new Date(millis).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function NotificationRow({
  notification,
  onRead,
  busy,
}: {
  notification: NotificationItem;
  onRead: (notification: NotificationItem) => void;
  busy: boolean;
}) {
  const Icon = notificationIcons[notification.type];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={clsx(
        "rounded-xl border p-3 transition",
        notification.read
          ? "border-[#dbe7e2] bg-white/65 dark:border-white/10 dark:bg-white/5"
          : "border-[#b7d5ce] bg-[#eef7f4]/80"
      )}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${notificationStyles[notification.type]}`}>
          <Icon size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-[#17211f] dark:text-white">{notification.title}</p>
              <p className="mt-1 text-sm leading-6 text-[#52645f] dark:text-white/65">{notification.message}</p>
            </div>
            {!notification.read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#d85435]" />}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[#6c7d78] dark:text-white/55">
              {notification.detail} - {formatTime(notification.createdAtMs)}
            </p>
            {!notification.read && (
              <button
                type="button"
                onClick={() => onRead(notification)}
                disabled={busy}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#135d54] transition hover:bg-[#d9eee8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Mark read
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function NotificationCentre() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [data, setData] = useState<NotificationCentreData>({
    notifications: [],
    settings: defaultNotificationSettings,
    unreadCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      const timer = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(timer);
    }

    const unsubscribe = subscribeNotificationCentre(
      user.uid,
      (notificationData) => {
        setData(notificationData);
        setError("");
        setLoading(false);
      },
      () => {
        setError("Notifications could not be loaded.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSettingsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const unreadNotifications = useMemo(
    () => data.notifications.filter((notification) => !notification.read),
    [data.notifications]
  );

  const handleMarkRead = async (notification: NotificationItem) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setBusyId(notification.id);
      await markNotificationAsRead(user.uid, notification.id);
    } finally {
      setBusyId("");
    }
  };

  const handleMarkAllRead = async () => {
    const user = auth.currentUser;
    if (!user || unreadNotifications.length === 0) return;

    try {
      setBusyId("all");
      await markNotificationsAsRead(
        user.uid,
        unreadNotifications.map((notification) => notification.id)
      );
    } finally {
      setBusyId("");
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    const nextSettings = { ...data.settings, [key]: value };
    setData((current) => ({ ...current, settings: nextSettings }));

    try {
      setSavingSettings(true);
      await saveNotificationSettings(user.uid, nextSettings);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#dbe7e2] bg-white text-[#52645f] transition hover:border-[#135d54] hover:text-[#135d54] dark:border-white/10 dark:bg-white/10 dark:text-white/75"
        aria-label="Open notification centre"
      >
        {data.unreadCount > 0 ? <BellRing size={18} aria-hidden="true" /> : <Bell size={18} aria-hidden="true" />}
        {data.unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#d85435] px-1 text-[11px] font-bold text-white">
            {data.unreadCount > 9 ? "9+" : data.unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 z-40 mt-3 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-white/45 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#17211f]/95"
          >
            <div className="border-b border-[#dbe7e2] bg-[#f8fbfa]/85 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#eef7f4] px-3 py-1 text-xs font-bold text-[#135d54]">
                    <Sparkles size={13} aria-hidden="true" />
                    Notification Centre
                  </div>
                  <h2 className="mt-2 text-xl font-bold">Updates</h2>
                  <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">
                    {data.unreadCount} unread notification{data.unreadCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsOpen((value) => !value)}
                  className={clsx(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition",
                    settingsOpen
                      ? "bg-[#135d54] text-white"
                      : "bg-white text-[#52645f] hover:text-[#135d54] dark:bg-white/10 dark:text-white/70"
                  )}
                  aria-label="Notification settings"
                  title="Settings"
                >
                  <Settings size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={unreadNotifications.length === 0 || busyId === "all"}
                  className="inline-flex items-center gap-2 rounded-full bg-[#135d54] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <CheckCheck size={16} aria-hidden="true" />
                  Mark all read
                </button>
                {loading && <Loader2 className="animate-spin text-[#135d54]" size={18} aria-hidden="true" />}
              </div>
            </div>

            {settingsOpen && (
              <div className="border-b border-[#dbe7e2] p-4 dark:border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">Settings</p>
                  {savingSettings && <Loader2 className="animate-spin text-[#135d54]" size={16} aria-hidden="true" />}
                </div>
                <div className="mt-3 grid gap-2">
                  {settingRows.map((setting) => (
                    <label
                      key={setting.key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-3 dark:border-white/10 dark:bg-white/5"
                    >
                      <span>
                        <span className="block text-sm font-bold">{setting.label}</span>
                        <span className="mt-1 block text-xs text-[#6c7d78] dark:text-white/55">{setting.description}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={data.settings[setting.key]}
                        onChange={(event) => updateSetting(setting.key, event.target.checked)}
                        className="h-5 w-5 rounded border-[#c9ded8] text-[#135d54] focus:ring-[#135d54]"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="max-h-[520px] overflow-y-auto p-3">
              {error ? (
                <div className="rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-sm font-semibold text-[#9d321f]">
                  {error}
                </div>
              ) : data.notifications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-6 text-center dark:border-white/15 dark:bg-white/5">
                  <Bell className="mx-auto text-[#135d54]" size={24} aria-hidden="true" />
                  <p className="mt-3 font-bold">No notifications yet</p>
                  <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">
                    Announcements, reminders, and course updates will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {data.notifications.map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        onRead={handleMarkRead}
                        busy={busyId === notification.id}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
