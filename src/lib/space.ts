import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCouple } from "@/lib/couple";

export type Kind =
  | "photo" | "memory" | "place" | "date" | "message" | "for_when" | "wish" | "task" | "idea" | "reminder";

export type SpaceItem = {
  id: string;
  couple_id: string;
  created_by: string;
  kind: Kind;
  title: string;
  body: string | null;
  category: string | null;
  item_date: string | null;
  item_time: string | null;
  place: string | null;
  photo_path: string | null;
  favorite: boolean;
  done: boolean;
  visibility: "private" | "shared";
  opened_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Field = "body" | "date" | "time" | "place" | "photo" | "category";

export type KindConfig = {
  kind: Kind;
  title: string;
  singular: string;
  intro: string;
  fields: Field[];
  categories?: { value: string; label: string }[];
  titleLabel?: string;
  bodyLabel?: string;
  dateLabel?: string;
  placeLabel?: string;
  photoRequired?: boolean;
  checkable?: boolean;
  favoritable?: boolean;
  defaultPrivate?: boolean;
  openable?: boolean;
  gallery?: boolean;
};

export const KINDS: Record<Kind, KindConfig> = {
  photo: {
    kind: "photo", title: "Fotos", singular: "foto", intro: "Vuestras fotos, solo para los dos.",
    fields: ["photo", "body"], photoRequired: true, favoritable: true, gallery: true, titleLabel: "Título (opcional)", bodyLabel: "Pie de foto",
  },
  memory: {
    kind: "memory", title: "Recuerdos", singular: "recuerdo", intro: "Momentos que no queréis olvidar.",
    fields: ["photo", "date", "place", "body"], favoritable: true, gallery: true, bodyLabel: "Descripción",
  },
  place: {
    kind: "place", title: "Lugares especiales", singular: "lugar", intro: "Los sitios que son vuestros.",
    fields: ["place", "body", "photo"], favoritable: true, titleLabel: "Nombre", placeLabel: "Ubicación o dirección", bodyLabel: "Por qué es especial",
  },
  date: {
    kind: "date", title: "Fechas importantes", singular: "fecha", intro: "Se repiten cada año y aparecen con cuenta atrás.",
    fields: ["category", "date", "body"],
    categories: [
      { value: "birthday", label: "Cumpleaños" }, { value: "anniversary", label: "Aniversario" },
      { value: "first_date", label: "Primera cita" }, { value: "custom", label: "Otra fecha" },
    ],
  },
  message: {
    kind: "message", title: "Mensajes especiales", singular: "mensaje", intro: "Cartas y notas para tu pareja.",
    fields: ["body"], favoritable: true, bodyLabel: "Mensaje",
  },
  for_when: {
    kind: "for_when", title: "Para cuando…", singular: "mensaje", intro: "Mensajes para abrir en el momento justo.",
    fields: ["category", "body"], openable: true, favoritable: true, bodyLabel: "Mensaje", titleLabel: "Título (o situación personalizada)",
    categories: [
      { value: "sad", label: "Cuando estés triste" }, { value: "miss", label: "Cuando me extrañes" },
      { value: "bad_day", label: "Cuando tengas un mal día" }, { value: "need_love", label: "Cuando necesites cariño" },
      { value: "angry", label: "Cuando estés enfadado/a" }, { value: "anniversary", label: "En nuestro aniversario" },
      { value: "custom", label: "Situación personalizada" },
    ],
  },
  wish: {
    kind: "wish", title: "Wishlist compartida", singular: "deseo", intro: "Todo lo que queréis tener, ver o hacer.",
    fields: ["category", "body"], checkable: true, favoritable: true, bodyLabel: "Notas o enlace",
    categories: [
      { value: "gift", label: "Regalos" }, { value: "food", label: "Restaurantes y comida" },
      { value: "movie", label: "Películas y series" }, { value: "trip", label: "Viajes" },
      { value: "place", label: "Lugares" }, { value: "date", label: "Citas" },
      { value: "game", label: "Juegos" }, { value: "activity", label: "Actividades juntos" },
    ],
  },
  task: {
    kind: "task", title: "Planes y tareas", singular: "tarea", intro: "Lo que tenéis pendiente o queréis hacer.",
    fields: ["date", "body"], checkable: true, dateLabel: "Para cuándo (opcional)", bodyLabel: "Notas",
  },
  idea: {
    kind: "idea", title: "Ideas de citas guardadas", singular: "idea", intro: "Vuestras citas favoritas del generador.",
    fields: ["category", "body"], checkable: true,
    categories: [
      { value: "home", label: "En casa" }, { value: "out", label: "Salir" }, { value: "food", label: "Comida" },
      { value: "romantic", label: "Romántica" }, { value: "fun", label: "Divertida" }, { value: "cheap", label: "Económica" },
    ],
  },
  reminder: {
    kind: "reminder", title: "Recordatorios", singular: "recordatorio", intro: "Te avisamos en el móvil el día y hora que elijas.",
    fields: ["category", "date", "time", "body"], checkable: true, defaultPrivate: true, dateLabel: "Día",
    categories: [
      { value: "date", label: "Fecha importante" }, { value: "birthday", label: "Cumpleaños" },
      { value: "anniversary", label: "Aniversario" }, { value: "event", label: "Evento" },
      { value: "plan", label: "Plan" }, { value: "task", label: "Tarea" },
      { value: "moment", label: "Momento especial" }, { value: "custom", label: "Otro" },
    ],
  },
};

export const isKind = (k: string): k is Kind => k in KINDS;

export function categoryLabel(kind: Kind, value: string | null) {
  return KINDS[kind].categories?.find((c) => c.value === value)?.label ?? null;
}

export function useSpaceItems(kind?: Kind) {
  const uid = useAuth().session?.user.id;
  const { data: couple } = useCouple();
  const coupleId = couple?.coupleId;
  return useQuery({
    queryKey: ["space-items", coupleId, kind ?? "all"],
    enabled: !!uid && !!coupleId,
    queryFn: async (): Promise<SpaceItem[]> => {
      let q = supabase.from("space_items").select("*").eq("couple_id", coupleId!);
      if (kind) q = q.eq("kind", kind);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SpaceItem[];
    },
  });
}

export function useMediaUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["media", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.storage.from("couple-media").createSignedUrl(path!, 3600);
      return data?.signedUrl ?? null;
    },
  });
}

export async function uploadMedia(coupleId: string, uid: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Solo imágenes");
  if (file.size > 10 * 1024 * 1024) throw new Error("La foto supera 10 MB");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${coupleId}/${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("couple-media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export async function removeMedia(path: string | null) {
  if (path) await supabase.storage.from("couple-media").remove([path]);
}

/** Days until next yearly occurrence of an ISO date (0 = today). */
export function daysUntilYearly(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let next = new Date(now.getFullYear(), m! - 1, d!);
  if (next < now) next = new Date(now.getFullYear() + 1, m! - 1, d!);
  return Math.round((next.getTime() - now.getTime()) / 86400000);
}

export function formatDate(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

export function timeTogether(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const start = new Date(y!, m! - 1, d!);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) { months -= 1; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years -= 1; months += 12; }
  const total = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return { years, months, days, total };
}
