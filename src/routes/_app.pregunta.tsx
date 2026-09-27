import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCouple } from "@/lib/couple";
import { PageHeader } from "@/components/PageHeader";
import { questionOfTheDay } from "@/lib/home";
import { dateKey } from "@/lib/calendar";
import { formatDate } from "@/lib/space";

export const Route = createFileRoute("/_app/pregunta")({
  head: () => ({ meta: [{ title: "Pregunta del día — NISO" }, { name: "description", content: "Una pregunta nueva cada día para los dos." }] }),
  component: Page,
});

type Answer = { id: string; user_id: string; question_date: string; question: string; answer: string };

function Page() {
  const uid = useAuth().session?.user.id;
  const { data: couple } = useCouple();
  const coupleId = couple?.coupleId;
  const qc = useQueryClient();
  const today = dateKey(new Date());
  const question = questionOfTheDay();
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: answers } = useQuery({
    queryKey: ["daily-answers", coupleId],
    enabled: !!coupleId,
    queryFn: async (): Promise<Answer[]> => {
      const { data, error } = await supabase.from("daily_answers").select("*").eq("couple_id", coupleId!).order("question_date", { ascending: false }).limit(200);
      if (error) throw error;
      return data as Answer[];
    },
  });

  const mine = answers?.find((a) => a.user_id === uid && a.question_date === today);
  const theirs = answers?.find((a) => a.user_id !== uid && a.question_date === today);
  const value = text ?? mine?.answer ?? "";

  async function save() {
    if (!value.trim() || !uid || !coupleId) return toast.error("Escribe tu respuesta");
    setBusy(true);
    const { error } = await supabase.from("daily_answers").upsert(
      { user_id: uid, couple_id: coupleId, question_date: today, question, answer: value.trim().slice(0, 2000) },
      { onConflict: "user_id,couple_id,question_date" },
    );
    setBusy(false);
    if (error) return toast.error("No se pudo guardar");
    setText(null);
    qc.invalidateQueries({ queryKey: ["daily-answers"] });
    toast.success("Respuesta guardada");
  }

  const partnerName = couple?.partner?.display_name ?? "Tu pareja";
  const past = Object.values(
    (answers ?? []).filter((a) => a.question_date !== today).reduce<Record<string, Answer[]>>((acc, a) => {
      (acc[a.question_date] ||= []).push(a);
      return acc;
    }, {}),
  );

  return (
    <div>
      <Link to="/nosotros" className="press -ml-1 mb-3 inline-flex items-center gap-1 text-[14px] text-muted-foreground"><ChevronLeft className="size-4" /> Nuestro espacio</Link>
      <PageHeader eyebrow="Pregunta del día" title={question} />

      <textarea value={value} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={4} placeholder="Tu respuesta…"
        className="mt-6 w-full resize-none rounded-2xl bg-muted px-4 py-3.5 text-[16px] outline-none focus:ring-2 ring-ring/50" />
      <button disabled={busy} onClick={save} className="press mt-3 w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:opacity-60">
        {mine ? "Actualizar respuesta" : "Responder"}
      </button>

      <div className="mt-5 rounded-[1.5rem] bg-sage-soft p-4">
        <p className="eyebrow">Respuesta de {partnerName}</p>
        {!mine ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" /> Responde tú primero para verla.</p>
        ) : theirs ? (
          <p className="mt-2 whitespace-pre-wrap text-[16px]">{theirs.answer}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Todavía no ha respondido.</p>
        )}
      </div>

      {past.length > 0 && (
        <>
          <p className="eyebrow mt-8 mb-3">Preguntas anteriores</p>
          <div className="space-y-3">
            {past.map((group) => (
              <div key={group[0]!.question_date} className="card-soft p-4">
                <p className="text-[12px] text-muted-foreground">{formatDate(group[0]!.question_date)}</p>
                <p className="mt-1 font-display text-[18px] leading-snug">{group[0]!.question}</p>
                {group.map((a) => (
                  <p key={a.id} className="mt-2 text-[14px]"><span className="font-medium">{a.user_id === uid ? "Tú" : partnerName}:</span> {a.answer}</p>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
