import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Lock, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCouple } from "@/lib/couple";
import { PageHeader } from "@/components/PageHeader";
import { timeAgo } from "@/lib/home";

export const Route = createFileRoute("/_app/checkin")({
  head: () => ({ meta: [{ title: "Check-in diario — NISO" }, { name: "description", content: "Cuéntale a tu pareja cómo te sientes hoy." }] }),
  component: Page,
});

export const CHECKIN_MOODS = [
  "😊 Feliz", "🥰 Cariñoso/a", "✨ Buen ánimo", "😴 Cansado/a", "🫂 Necesito cariño",
  "😢 Triste", "😠 Molesto/a", "💬 Quiero hablar", "🥺 Te extraño",
];

type Checkin = { id: string; user_id: string; mood: string; note: string | null; shared: boolean; created_at: string };

function Page() {
  const uid = useAuth().session?.user.id;
  const { data: couple } = useCouple();
  const qc = useQueryClient();
  const [mood, setMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [shared, setShared] = useState(true);
  const [busy, setBusy] = useState(false);

  const { data: list } = useQuery({
    queryKey: ["checkins", uid],
    enabled: !!uid,
    queryFn: async (): Promise<Checkin[]> => {
      const { data, error } = await supabase.from("checkins").select("*").order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      return data as Checkin[];
    },
  });

  async function save() {
    if (!mood || !uid) { toast.error("Elige cómo te sientes"); return; }
    setBusy(true);
    const { error } = await supabase.from("checkins").insert({ user_id: uid, mood, note: note.trim().slice(0, 500) || null, shared });
    setBusy(false);
    if (error) { toast.error("No se pudo guardar"); return; }
    setMood(null); setNote("");
    qc.invalidateQueries({ queryKey: ["checkins"] });
    toast.success(shared ? "Check-in compartido" : "Check-in guardado solo para ti");
  }

  async function remove(id: string) {
    await supabase.from("checkins").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["checkins"] });
  }

  const partnerName = couple?.partner?.display_name ?? "Tu pareja";
  const partnerLast = list?.find((c) => c.user_id !== uid);

  return (
    <div>
      <Link to="/nosotros" className="press -ml-1 mb-3 inline-flex items-center gap-1 text-[14px] text-muted-foreground"><ChevronLeft className="size-4" /> Nuestro espacio</Link>
      <PageHeader title="¿Cómo te sientes?" />

      {partnerLast && (
        <div className="fade-up mt-5 rounded-[1.5rem] bg-sage-soft p-4">
          <p className="eyebrow">{partnerName} · {timeAgo(partnerLast.created_at)}</p>
          <p className="mt-1 text-[18px]">{partnerLast.mood}</p>
          {partnerLast.note && <p className="mt-1 text-sm text-muted-foreground">{partnerLast.note}</p>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {CHECKIN_MOODS.map((m) => (
          <button key={m} onClick={() => setMood(mood === m ? null : m)}
            className={`press rounded-full px-3.5 py-2 text-[14px] ${mood === m ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m}</button>
        ))}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="¿Quieres añadir algo? (opcional)"
        className="mt-4 w-full resize-none rounded-2xl bg-muted px-4 py-3.5 text-[16px] outline-none focus:ring-2 ring-ring/50" />
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
        <button onClick={() => setShared(true)} className={`press flex items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] ${shared ? "bg-card shadow-sm" : "text-muted-foreground"}`}><Users className="size-4" /> Compartido</button>
        <button onClick={() => setShared(false)} className={`press flex items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] ${!shared ? "bg-card shadow-sm" : "text-muted-foreground"}`}><Lock className="size-4" /> Solo para mí</button>
      </div>
      <button disabled={busy} onClick={save} className="press mt-4 w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:opacity-60">Guardar check-in</button>

      <p className="eyebrow mt-8 mb-3">Historial</p>
      <div className="space-y-2">
        {(list ?? []).map((c) => (
          <div key={c.id} className="card-soft flex items-start gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-[15px]">{c.mood}</p>
              <p className="text-[12px] text-muted-foreground">
                {c.user_id === uid ? "Tú" : partnerName} · {new Date(c.created_at).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                {c.user_id === uid && !c.shared && " · solo para ti"}
              </p>
              {c.note && <p className="mt-1 text-[13px] text-muted-foreground">{c.note}</p>}
            </div>
            {c.user_id === uid && <button onClick={() => remove(c.id)} aria-label="Eliminar" className="press text-faint"><Trash2 className="size-4" /></button>}
          </div>
        ))}
        {list?.length === 0 && <p className="card-soft p-5 text-center text-sm text-muted-foreground">Aún no hay check-ins.</p>}
      </div>
    </div>
  );
}
