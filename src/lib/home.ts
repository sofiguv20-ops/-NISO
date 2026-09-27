import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export const HOME_CARDS = [
  { id: "plan", label: "Próximo plan" },
  { id: "partner", label: "Estado de mi pareja" },
  { id: "cycle", label: "Ciclo" },
  { id: "location", label: "Ubicación" },
  { id: "question", label: "Pregunta del día" },
  { id: "memory", label: "Recuerdo" },
] as const;
export type HomeCardId = (typeof HOME_CARDS)[number]["id"];

export type Settings = {
  share_mood: boolean;
  share_activity: boolean;
  share_custom_status: boolean;
  share_cycle_phase: boolean;
  share_cycle_dates: boolean;
  share_cycle_symptoms: boolean;
  share_location: boolean;
  hidden_home_cards: string[];
};
const defaults: Settings = {
  share_mood: true,
  share_activity: true,
  share_custom_status: true,
  share_cycle_phase: false,
  share_cycle_dates: false,
  share_cycle_symptoms: false,
  share_location: false,
  hidden_home_cards: [],
};

export function useSettings() {
  const uid = useAuth().session?.user.id;
  return useQuery({
    queryKey: ["settings", uid],
    enabled: !!uid,
    queryFn: async (): Promise<Settings> => {
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", uid!).maybeSingle();
      return data ?? defaults;
    },
  });
}

export async function saveSettings(uid: string, patch: Partial<Settings>) {
  return supabase.from("user_settings").upsert({ user_id: uid, ...patch });
}

export function useMyStatus() {
  const uid = useAuth().session?.user.id;
  return useQuery({
    queryKey: ["my-status", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("user_status").select("*").eq("user_id", uid!).maybeSingle();
      return data;
    },
  });
}

export function usePartnerStatus(enabled: boolean) {
  return useQuery({
    queryKey: ["partner-status"],
    enabled,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_partner_status");
      return data?.[0] ?? null;
    },
  });
}

export const MOODS = ["😊 Feliz", "🥰 Cariñosa/o", "😌 Tranquila/o", "😴 Cansada/o", "😔 Baja/o", "😤 Estresada/o", "🤒 Malita/o"];

const QUESTIONS = [
  "¿Cuál es tu recuerdo favorito de nosotros este año?",
  "Si pudiéramos escaparnos mañana, ¿adónde irías?",
  "¿Qué pequeño gesto mío te alegra el día?",
  "¿Qué canción te recuerda a mí?",
  "¿Qué te gustaría que aprendiéramos juntos?",
  "¿Cuál fue el momento en que supiste que te gustaba?",
  "¿Qué plan sencillo te apetece esta semana?",
  "¿Qué es algo que nunca te he preguntado?",
  "¿Cómo sería nuestro domingo perfecto?",
  "¿Qué te hace sentir más querida/o?",
  "¿Qué sueño te gustaría cumplir en los próximos cinco años?",
  "¿Qué comida te recuerda a tu infancia?",
  "¿Qué es lo más bonito que alguien ha hecho por ti?",
  "¿En qué momento del día piensas más en mí?",
];
export function questionOfTheDay(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return QUESTIONS[day % QUESTIONS.length]!;
}

export function daysSince(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const start = new Date(y!, m! - 1, d!);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((now.getTime() - start.getTime()) / 86400000));
}

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}
