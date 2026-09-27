import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCouple } from "@/lib/couple";

export const EVENT_TYPES = [
  { value: "appointment", label: "Cita", emoji: "✦" },
  { value: "study", label: "Estudio", emoji: "⌁" },
  { value: "work", label: "Trabajo", emoji: "○" },
  { value: "birthday", label: "Cumpleaños", emoji: "✿" },
  { value: "anniversary", label: "Aniversario", emoji: "♡" },
  { value: "trip", label: "Viaje", emoji: "↗" },
  { value: "plan", label: "Plan", emoji: "✧" },
  { value: "other", label: "Otro", emoji: "·" },
] as const;

export const REMINDERS = [
  { value: "", label: "Sin recordatorio" },
  { value: "0", label: "A la hora del evento" },
  { value: "10", label: "10 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "1440", label: "1 día antes" },
] as const;

export const RECURRENCES = [
  { value: "none", label: "No repetir" },
  { value: "daily", label: "Cada día" },
  { value: "weekly", label: "Cada semana" },
  { value: "monthly", label: "Cada mes" },
  { value: "yearly", label: "Cada año" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["value"];
export type Recurrence = (typeof RECURRENCES)[number]["value"];
export type EventAudience = "me" | "partner" | "both";

export type CalendarEvent = {
  id: string;
  couple_id: string;
  created_by: string;
  owner_id: string | null;
  title: string;
  event_type: EventType;
  starts_on: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
  reminder_minutes: number | null;
  recurrence: Recurrence;
  created_at: string;
  updated_at: string;
};

export type EventDraft = {
  title: string;
  event_type: EventType;
  starts_on: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  owner_id: string | null;
  location: string | null;
  notes: string | null;
  reminder_minutes: number | null;
  recurrence: Recurrence;
};

export type CalendarOccurrence = CalendarEvent & {
  occurrence_date: string;
  occurrence_id: string;
};

export function useCalendarEvents() {
  const uid = useAuth().session?.user.id;
  const { data: couple } = useCouple();
  return useQuery({
    queryKey: ["calendar-events", uid, couple?.coupleId],
    enabled: !!uid && !!couple?.coupleId,
    queryFn: async (): Promise<CalendarEvent[]> => {
      const { data, error } = await supabase
        .from("couple_events")
        .select("*")
        .eq("couple_id", couple!.coupleId!)
        .order("starts_on", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarEvent[];
    },
  });
}

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  next.setDate(next.getDate() - (day === 0 ? 6 : day - 1));
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function monthGrid(date: Date) {
  const first = startOfWeek(startOfMonth(date));
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

function sameOrBefore(left: Date, right: Date) {
  return left.getTime() <= right.getTime();
}

function occurrenceAt(event: CalendarEvent, occurrenceDate: Date): CalendarOccurrence {
  const occurrence_date = dateKey(occurrenceDate);
  return { ...event, occurrence_date, occurrence_id: `${event.id}:${occurrence_date}` };
}

export function expandEvents(events: CalendarEvent[], from: Date, to: Date) {
  const result: CalendarOccurrence[] = [];
  const fromKey = dateKey(from);
  const toKey = dateKey(to);

  for (const event of events) {
    const base = parseDateKey(event.starts_on);
    if (event.recurrence === "none") {
      if (event.starts_on >= fromKey && event.starts_on <= toKey)
        result.push(occurrenceAt(event, base));
      continue;
    }

    let cursor = new Date(base);
    while (sameOrBefore(cursor, to)) {
      if (dateKey(cursor) >= fromKey) result.push(occurrenceAt(event, cursor));
      if (event.recurrence === "daily") cursor = addDays(cursor, 1);
      else if (event.recurrence === "weekly") cursor = addDays(cursor, 7);
      else if (event.recurrence === "monthly")
        cursor = new Date(
          cursor.getFullYear(),
          cursor.getMonth() + 1,
          Math.min(base.getDate(), 28),
        );
      else cursor = new Date(cursor.getFullYear() + 1, cursor.getMonth(), base.getDate());
    }
  }

  return result.sort((a, b) =>
    `${a.occurrence_date}${a.start_time ?? ""}`.localeCompare(
      `${b.occurrence_date}${b.start_time ?? ""}`,
    ),
  );
}

export function eventTypeLabel(type: EventType) {
  return EVENT_TYPES.find((item) => item.value === type)?.label ?? "Otro";
}

export function recurrenceLabel(recurrence: Recurrence) {
  return RECURRENCES.find((item) => item.value === recurrence)?.label ?? "No repetir";
}

export function timeLabel(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

export function displayDate(value: string) {
  return parseDateKey(value).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}
