export const CALENDAR_EVENT_TYPES = ["assignment", "lesson", "exam", "event", "deadline", "schedule"] as const;
export const CALENDAR_CUSTOM_EVENT_TYPES = ["exam", "event", "deadline", "schedule"] as const;
export const CALENDAR_AUDIENCES = ["all", "teachers", "students", "personal"] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];
export type CalendarCustomEventType = (typeof CALENDAR_CUSTOM_EVENT_TYPES)[number];
export type CalendarAudience = (typeof CALENDAR_AUDIENCES)[number];
export type CalendarEventSource = "assignment" | "lesson" | "calendarEvent";
export type CalendarUserRole = "student" | "teacher";

export interface CalendarEvent {
  id: string;
  sourceId: string;
  source: CalendarEventSource;
  type: CalendarEventType;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  audience: CalendarAudience;
  ownerId: string;
  ownerEmail: string;
  readOnly: boolean;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface CalendarEventFormValues {
  type: CalendarCustomEventType;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  audience: CalendarAudience;
}

export interface CalendarSummary {
  assignments: number;
  lessons: number;
  exams: number;
  deadlines: number;
  events: number;
  schedule: number;
}
