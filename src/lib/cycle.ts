import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { addDays, dateKey, parseDateKey } from "@/lib/calendar";

export const FLOWS = [
  { value: "spotting", label: "Manchado" },
  { value: "light", label: "Ligero" },
  { value: "medium", label: "Medio" },
  { value: "heavy", label: "Abundante" },
] as const;
export type Flow = (typeof FLOWS)[number]["value"];

export const SYMPTOMS = [
  "Dolor de cabeza",
  "Hinchazón",
  "Náuseas",
  "Acné",
  "Senos sensibles",
  "Antojos",
  "Calambres",
  "Dolor lumbar",
  "Insomnio",
  "Mareos",
] as const;

export const CYCLE_MOODS = ["😊 Bien", "😌 Tranquila", "😔 Baja", "😤 Irritable", "🥺 Sensible", "😴 Agotada"];

export type CycleDay = {
  user_id: string;
  day: string;
  flow: Flow | null;
  pain: number | null;
  mood: string | null;
  energy: number | null;
  sleep_hours: number | null;
  symptoms: string[];
  notes: string | null;
  updated_at: string;
};

export type CycleDayDraft = {
  day: string;
  flow: Flow | null;
  pain: number | null;
  mood: string | null;
  energy: number | null;
  sleep_hours: number | null;
  symptoms: string[];
  notes: string | null;
};

export function useCycleDays() {
  const uid = useAuth().session?.user.id;
  return useQuery({
    queryKey: ["cycle-days", uid],
    enabled: !!uid,
    queryFn: async (): Promise<CycleDay[]> => {
      const { data, error } = await supabase
        .from("cycle_days")
        .select("*")
        .eq("user_id", uid!)
        .order("day", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CycleDay[];
    },
  });
}

export async function saveCycleDay(uid: string, draft: CycleDayDraft) {
  return supabase.from("cycle_days").upsert({ user_id: uid, ...draft }, { onConflict: "user_id,day" });
}

export async function deleteCycleDay(uid: string, day: string) {
  return supabase.from("cycle_days").delete().eq("user_id", uid).eq("day", day);
}

export type Period = { start: string; end: string; days: number };

/** Groups consecutive (or near-consecutive, <=1 day gap) bleeding days into periods, newest first. */
export function buildPeriods(days: CycleDay[]): Period[] {
  const bleeding = days
    .filter((d) => d.flow)
    .map((d) => d.day)
    .sort();
  const periods: Period[] = [];
  let start: string | null = null;
  let previous: string | null = null;

  for (const day of bleeding) {
    if (!start || !previous) {
      start = day;
      previous = day;
      continue;
    }
    const gap = Math.round((parseDateKey(day).getTime() - parseDateKey(previous).getTime()) / 86400000);
    if (gap <= 2) {
      previous = day;
    } else {
      periods.push(makePeriod(start, previous));
      start = day;
      previous = day;
    }
  }
  if (start && previous) periods.push(makePeriod(start, previous));
  return periods.reverse();
}

function makePeriod(start: string, end: string): Period {
  const length = Math.round((parseDateKey(end).getTime() - parseDateKey(start).getTime()) / 86400000) + 1;
  return { start, end, days: length };
}

export type CycleEstimate = {
  cycleLength: number | null;
  periodLength: number | null;
  nextPeriod: string | null;
  ovulation: string | null;
  fertileFrom: string | null;
  fertileTo: string | null;
  dayOfCycle: number | null;
  samples: number;
};

export function estimate(periods: Period[]): CycleEstimate {
  const empty: CycleEstimate = {
    cycleLength: null,
    periodLength: null,
    nextPeriod: null,
    ovulation: null,
    fertileFrom: null,
    fertileTo: null,
    dayOfCycle: null,
    samples: periods.length,
  };
  if (periods.length === 0) return empty;

  const last = periods[0]!;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfCycle =
    Math.round((today.getTime() - parseDateKey(last.start).getTime()) / 86400000) + 1;

  const periodLength = Math.round(
    periods.reduce((sum, p) => sum + p.days, 0) / periods.length,
  );

  // Need at least two periods to know the distance between them.
  if (periods.length < 2) {
    return { ...empty, periodLength, dayOfCycle: dayOfCycle > 0 ? dayOfCycle : null };
  }

  const gaps: number[] = [];
  for (let i = 0; i < periods.length - 1; i += 1) {
    const gap = Math.round(
      (parseDateKey(periods[i]!.start).getTime() - parseDateKey(periods[i + 1]!.start).getTime()) /
        86400000,
    );
    if (gap >= 18 && gap <= 60) gaps.push(gap);
  }
  if (gaps.length === 0) {
    return { ...empty, periodLength, dayOfCycle: dayOfCycle > 0 ? dayOfCycle : null };
  }

  const cycleLength = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  let next = addDays(parseDateKey(last.start), cycleLength);
  while (next.getTime() < today.getTime()) next = addDays(next, cycleLength);
  const ovulation = addDays(next, -14);

  return {
    cycleLength,
    periodLength,
    nextPeriod: dateKey(next),
    ovulation: dateKey(ovulation),
    fertileFrom: dateKey(addDays(ovulation, -5)),
    fertileTo: dateKey(addDays(ovulation, 1)),
    dayOfCycle: dayOfCycle > 0 ? dayOfCycle : null,
    samples: periods.length,
  };
}

export function phaseLabel(est: CycleEstimate, periods: Period[]) {
  if (periods.length === 0) return null;
  const today = dateKey(new Date());
  const last = periods[0]!;
  if (today >= last.start && today <= last.end) return "Menstruación";
  if (est.fertileFrom && est.fertileTo && today >= est.fertileFrom && today <= est.fertileTo)
    return "Ventana fértil estimada";
  if (est.ovulation && today === est.ovulation) return "Ovulación estimada";
  if (est.dayOfCycle && est.cycleLength && est.dayOfCycle > est.cycleLength - 7) return "Fase lútea";
  return "Fase folicular";
}

export function daysUntil(day: string | null) {
  if (!day) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDateKey(day).getTime() - today.getTime()) / 86400000);
}

export type PartnerCycle = {
  shares_dates: boolean;
  shares_symptoms: boolean;
  last_period_start: string | null;
  last_period_end: string | null;
  recent_symptoms: string[] | null;
  recent_mood: string | null;
  updated_at: string | null;
};

export function usePartnerCycle(enabled: boolean) {
  return useQuery({
    queryKey: ["partner-cycle"],
    enabled,
    queryFn: async (): Promise<PartnerCycle | null> => {
      const { data } = await supabase.rpc("get_partner_cycle");
      return (data?.[0] as PartnerCycle) ?? null;
    },
  });
}
