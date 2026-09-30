import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BookOpenCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  GraduationCap,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { auth } from "../../lib/firebase";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  subscribeCalendarEvents,
  summarizeCalendarEvents,
  updateCalendarEvent,
} from "../../lib/calendar";
import type {
  CalendarEvent,
  CalendarEventFormValues,
  CalendarEventType,
  CalendarUserRole,
} from "../../types/calendar";
import CalendarEventForm from "./CalendarEventForm";
import CalendarState from "./CalendarState";

interface CalendarModuleProps {
  role: CalendarUserRole | null;
}

type CalendarFilter = "all" | CalendarEventType;

interface CalendarDay {
  date: Date;
  key: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

const filters: Array<{ value: CalendarFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "assignment", label: "Assignments" },
  { value: "lesson", label: "Lessons" },
  { value: "exam", label: "Exams" },
  { value: "event", label: "Events" },
  { value: "deadline", label: "Deadlines" },
  { value: "schedule", label: "Schedule" },
];

const skeletonCards = Array.from({ length: 6 }, (_, index) => index);

const typeStyles: Record<CalendarEventType, string> = {
  assignment: "bg-[#fff1ec] text-[#9d321f] border-[#ffd8c9]",
  lesson: "bg-[#eef7f4] text-[#135d54] border-[#b7d5ce]",
  exam: "bg-[#f7edf9] text-[#7a3d8a] border-[#e9c9ef]",
  event: "bg-[#edf5fb] text-[#2f6f9f] border-[#c6dff1]",
  deadline: "bg-[#fff7df] text-[#8a6415] border-[#f2dfa1]",
  schedule: "bg-[#f0f3f2] text-[#52645f] border-[#dbe7e2]",
};

const typeIcons: Record<CalendarEventType, typeof CalendarDays> = {
  assignment: ClipboardList,
  lesson: BookOpenCheck,
  exam: GraduationCap,
  event: CalendarDays,
  deadline: Clock,
  schedule: Users,
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMonth = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

const formatDate = (dateKey: string) => {
  if (!dateKey) return "No date";
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const getMonthDays = (monthDate: Date): CalendarDay[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  const todayKey = toDateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = toDateKey(date);

    return {
      date,
      key,
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
      isToday: key === todayKey,
    };
  });
};

const includesSearch = (event: CalendarEvent, searchTerm: string) => {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;
  return [event.title, event.description, event.type, event.ownerEmail].some((value) =>
    value.toLowerCase().includes(term)
  );
};

const canEditEvent = (event: CalendarEvent, userId: string) => !event.readOnly && event.ownerId === userId;

function EventPill({ event }: { event: CalendarEvent }) {
  const Icon = typeIcons[event.type];

  return (
    <span
      className={`flex min-w-0 items-center gap-1 rounded-md border px-2 py-1 text-left text-[11px] font-bold ${typeStyles[event.type]}`}
      title={event.title}
    >
      <Icon className="shrink-0" size={12} aria-hidden="true" />
      <span className="truncate">{event.title}</span>
    </span>
  );
}

function AgendaEventCard({
  event,
  editable,
  busy,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  editable: boolean;
  busy: boolean;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
}) {
  const Icon = typeIcons[event.type];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${typeStyles[event.type]}`}>
            <Icon size={21} aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${typeStyles[event.type]}`}>
                {event.type}
              </span>
              <span className="rounded-full bg-[#f0f3f2] px-3 py-1 text-xs font-bold text-[#52645f]">
                {event.audience}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold">{event.title}</h3>
            {event.description && (
              <p className="mt-2 leading-7 text-[#52645f] dark:text-white/65">{event.description}</p>
            )}
            <p className="mt-3 text-sm font-semibold text-[#6c7d78] dark:text-white/55">
              {formatDate(event.date)} at {event.startTime} - {event.endTime}
            </p>
          </div>
        </div>

        {editable && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(event)}
              disabled={busy}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#c9ded8] bg-white/80 text-[#52645f] transition hover:border-[#135d54] hover:text-[#135d54] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Edit calendar event"
              title="Edit"
            >
              <Pencil size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(event)}
              disabled={busy}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#ffd8c9] bg-[#fff1ec] text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Delete calendar event"
              title="Delete"
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
}

export default function CalendarModule({ role }: CalendarModuleProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeMonth, setActiveMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [activeFilter, setActiveFilter] = useState<CalendarFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyEventId, setBusyEventId] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const calendarRole: CalendarUserRole = role === "teacher" ? "teacher" : "student";
  const userId = auth.currentUser?.uid ?? "";

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      const timer = window.setTimeout(() => {
        setEvents([]);
        setLoading(false);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const unsubscribe = subscribeCalendarEvents(
      user.uid,
      calendarRole,
      (eventData) => {
        setEvents(eventData);
        setLoading(false);
      },
      () => {
        setError("Calendar data could not be synchronized. Check your connection and try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [calendarRole]);

  const monthDays = useMemo(() => getMonthDays(activeMonth), [activeMonth]);
  const summary = useMemo(() => summarizeCalendarEvents(events), [events]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesFilter = activeFilter === "all" || event.type === activeFilter;
        return matchesFilter && includesSearch(event, searchTerm);
      }),
    [activeFilter, events, searchTerm]
  );

  const selectedEvents = useMemo(
    () => filteredEvents.filter((event) => event.date === selectedDate),
    [filteredEvents, selectedDate]
  );

  const upcomingEvents = useMemo(
    () => filteredEvents.filter((event) => event.date >= toDateKey(new Date())).slice(0, 6),
    [filteredEvents]
  );

  const monthEventMap = useMemo(
    () =>
      filteredEvents.reduce<Record<string, CalendarEvent[]>>((eventMap, event) => {
        eventMap[event.date] = [...(eventMap[event.date] ?? []), event];
        return eventMap;
      }, {}),
    [filteredEvents]
  );

  const moveMonth = (direction: -1 | 1) => {
    setActiveMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const handleSubmit = async (values: CalendarEventFormValues) => {
    const user = auth.currentUser;
    setActionError("");

    if (!user) {
      setActionError("Sign in again before saving calendar events.");
      return;
    }

    try {
      setSubmitting(true);

      if (editingEvent) {
        await updateCalendarEvent(editingEvent, values, calendarRole);
      } else {
        await createCalendarEvent(values, { uid: user.uid, email: user.email || "Educor user" }, calendarRole);
      }

      setEditingEvent(null);
      setSelectedDate(values.date);
      setActiveMonth(new Date(`${values.date}T00:00:00`));
    } catch {
      setActionError("Calendar event could not be saved. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    setActionError("");
    setBusyEventId(event.id);

    try {
      await deleteCalendarEvent(event);
      if (editingEvent?.id === event.id) setEditingEvent(null);
    } catch {
      setActionError("Calendar event could not be deleted.");
    } finally {
      setBusyEventId("");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="h-72 animate-pulse rounded-2xl border border-white/35 bg-[#135d54]/80 shadow-xl" />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {skeletonCards.map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-xl border border-white/45 bg-white/60 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
            />
          ))}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <CalendarState
        icon={RefreshCw}
        title="Calendar did not sync"
        message={error}
        actionLabel="Refresh page"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#135d54] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(216,84,53,0.36),_transparent_34%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Calendar
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              Assignments, lessons, exams, deadlines, and schedules in one live view.
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              Educor keeps teacher planning and student schedules synchronized from Firestore.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/15 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-white/60">Upcoming</p>
              <CalendarDays size={22} aria-hidden="true" />
            </div>
            <p className="mt-4 text-5xl font-bold">{upcomingEvents.length}</p>
            <p className="mt-2 text-sm text-white/70">Visible events from the current filters.</p>
          </div>
        </div>
      </motion.section>

      {actionError && (
        <section className="flex items-start gap-3 rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-[#9d321f]">
          <AlertCircle className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
          <p className="font-semibold">{actionError}</p>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Assignments", value: summary.assignments, icon: ClipboardList },
          { label: "Lessons", value: summary.lessons, icon: BookOpenCheck },
          { label: "Exams", value: summary.exams, icon: GraduationCap },
          { label: "Events", value: summary.events, icon: CalendarDays },
          { label: "Deadlines", value: summary.deadlines, icon: Clock },
          { label: "Schedule", value: summary.schedule, icon: Users },
        ].map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.article
              key={item.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef7f4] text-[#135d54]">
                <Icon size={20} aria-hidden="true" />
              </span>
              <p className="mt-4 text-sm font-semibold text-[#52645f] dark:text-white/65">{item.label}</p>
              <p className="mt-1 text-3xl font-bold">{item.value}</p>
            </motion.article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-4">
          <section className="grid gap-3 rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl lg:grid-cols-[1fr_260px] lg:items-center dark:border-white/10 dark:bg-white/10">
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={clsx(
                    "rounded-full px-4 py-2 text-sm font-bold transition",
                    activeFilter === filter.value
                      ? "bg-[#135d54] text-white"
                      : "bg-[#eef7f4] text-[#52645f] hover:text-[#135d54] dark:bg-white/10 dark:text-white/70"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <label className="relative">
              <span className="sr-only">Search calendar</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7d78]"
                size={17}
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search calendar"
                className="w-full rounded-full border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
              />
            </label>
          </section>

          <section className="rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-[#d85435]">Month view</p>
                <h2 className="mt-1 text-2xl font-bold">{formatMonth(activeMonth)}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#c9ded8] bg-white/80 text-[#52645f] transition hover:border-[#135d54] hover:text-[#135d54]"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setActiveMonth(now);
                    setSelectedDate(toDateKey(now));
                  }}
                  className="rounded-full bg-[#eef7f4] px-4 py-2 text-sm font-bold text-[#135d54] transition hover:bg-[#d9eee8]"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#c9ded8] bg-white/80 text-[#52645f] transition hover:border-[#135d54] hover:text-[#135d54]"
                  aria-label="Next month"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase text-[#6c7d78] dark:text-white/55">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-7">
              {monthDays.map((day) => {
                const dayEvents = monthEventMap[day.key] ?? [];
                const selected = selectedDate === day.key;

                return (
                  <motion.button
                    layout
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDate(day.key)}
                    whileHover={{ y: -2 }}
                    className={clsx(
                      "min-h-32 rounded-xl border p-3 text-left transition",
                      selected
                        ? "border-[#135d54] bg-[#eef7f4] shadow-sm"
                        : "border-[#dbe7e2] bg-white/70 hover:border-[#b7d5ce] dark:border-white/10 dark:bg-white/5",
                      !day.inCurrentMonth && "opacity-55"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={clsx(
                          "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
                          day.isToday ? "bg-[#135d54] text-white" : "text-[#17211f] dark:text-white"
                        )}
                      >
                        {day.dayNumber}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="rounded-full bg-[#135d54] px-2 py-1 text-xs font-bold text-white">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <EventPill key={event.id} event={event} />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="block text-xs font-bold text-[#6c7d78] dark:text-white/55">
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{formatDate(selectedDate)}</h2>
                <p className="text-sm text-[#52645f] dark:text-white/65">Selected day agenda</p>
              </div>
              <span className="rounded-full bg-[#eef7f4] px-4 py-2 text-sm font-bold text-[#135d54]">
                {selectedEvents.length} events
              </span>
            </div>

            {selectedEvents.length === 0 ? (
              <CalendarState
                icon={CalendarDays}
                title="No events on this day"
                message="Pick another date or create a calendar item for this schedule."
              />
            ) : (
              <div className="grid gap-3">
                {selectedEvents.map((event) => (
                  <AgendaEventCard
                    key={event.id}
                    event={event}
                    editable={canEditEvent(event, userId)}
                    busy={busyEventId === event.id || submitting}
                    onEdit={setEditingEvent}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <CalendarEventForm
            key={editingEvent?.id ?? `new-${calendarRole}`}
            role={calendarRole}
            initialEvent={editingEvent}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={editingEvent ? () => setEditingEvent(null) : undefined}
          />

          <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">{calendarRole === "teacher" ? "Teacher deadlines" : "Student schedule"}</h2>
                <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Next items from the active filters.</p>
              </div>
              <Clock className="text-[#135d54]" size={22} aria-hidden="true" />
            </div>

            {upcomingEvents.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-4 text-sm font-semibold text-[#52645f] dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                No upcoming calendar items.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {upcomingEvents.map((event) => {
                  const Icon = typeIcons[event.type];

                  return (
                    <div
                      key={event.id}
                      className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${typeStyles[event.type]}`}>
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold">{event.title}</p>
                          <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">
                            {formatDate(event.date)} at {event.startTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
