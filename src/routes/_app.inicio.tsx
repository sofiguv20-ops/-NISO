import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarHeart, ChevronRight, MapPin, Moon, Pencil, Sparkles, Image as ImageIcon, MessageCircleHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCouple } from "@/lib/couple";
import {
  MOODS, daysSince, questionOfTheDay, timeAgo, useMyStatus, usePartnerStatus, useSettings,
  type HomeCardId,
} from "@/lib/home";
import { Avatar } from "@/components/Avatar";
import { BottomSheet } from "@/components/Sheet";
import {
  addDays,
  dateKey,
  displayDate,
  expandEvents,
  timeLabel,
  useCalendarEvents,
} from "@/lib/calendar";
import { daysUntil, usePartnerCycle } from "@/lib/cycle";
import { usePartnerLocation } from "@/lib/location";

export const Route = createFileRoute("/_app/inicio")({
  head: () => ({ meta: [{ title: "Inicio — NISO" }, { name: "description", content: "Vuestro resumen del día." }] }),
  component: Inicio,
});

function Inicio() {
  const { data } = useCouple();
  const { data: settings } = useSettings();
  const partner = data?.partner;
  const { data: ps } = usePartnerStatus(!!partner);
  const [editDate, setEditDate] = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const hidden = new Set(settings?.hidden_home_cards ?? []);
  const show = (id: HomeCardId) => !hidden.has(id);

  const { data: events } = useCalendarEvents();
  const nextPlan = useMemo(() => {
    if (!events?.length) return null;
    const today = new Date();
    const occurrences = expandEvents(events, today, addDays(today, 180));
    return occurrences[0] ?? null;
  }, [events]);

  if (data && !partner) return <NoPartner name={data.me?.display_name} />;

  const me = data?.me;
  const days = data?.startedOn ? daysSince(data.startedOn) : null;

  return (
    <div className="space-y-4">
      {/* Top: both of us */}
      <section className="fade-up flex flex-col items-center pt-2 text-center">
        <div className="flex -space-x-4">
          <Avatar path={me?.avatar_path} name={me?.display_name} className="size-20 text-2xl ring-4 ring-background" />
          <Avatar path={partner?.avatar_path} name={partner?.display_name} className="size-20 bg-sage-soft text-2xl ring-4 ring-background" />
        </div>
        <p className="mt-4 text-[13px] tracking-wide text-muted-foreground">
          {me?.display_name} <span className="text-primary">&</span> {partner?.display_name}
        </p>
        <button onClick={() => setEditDate(true)} className="press mt-1">
          {days !== null ? (
            <h1 className="text-[34px] leading-tight">
              Llevamos <span className="italic text-primary">{days.toLocaleString("es")} {days === 1 ? "día" : "días"}</span>
            </h1>
          ) : (
            <h1 className="text-[28px] leading-tight">
              ¿Desde cuándo <span className="italic text-primary">estáis juntos?</span>
            </h1>
          )}
          <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-faint">
            <Pencil className="size-3" /> {days !== null ? "Cambiar fecha" : "Añadir fecha"}
          </span>
        </button>
      </section>

      {show("plan") && (
        <Card eyebrow="Próximo plan" icon={<CalendarHeart className="size-4" strokeWidth={1.5} />} tint="bg-blush-soft text-primary">
          {nextPlan ? (
            <div className="space-y-1">
              <p className="text-[17px]">{nextPlan.title}</p>
              <p className="text-[13px] text-muted-foreground">
                {displayDate(nextPlan.occurrence_date)}
                {nextPlan.start_time ? ` · ${timeLabel(nextPlan.start_time)}` : ""}
                {nextPlan.location ? ` · ${nextPlan.location}` : ""}
              </p>
            </div>
          ) : (
            <Empty text="Aún no hay planes próximos. Crea uno en el calendario." />
          )}
          <Link to="/calendario" className="mt-3 inline-flex items-center gap-1 text-[13px] text-primary">
            Ir al calendario <ChevronRight className="size-3.5" />
          </Link>
        </Card>
      )}


      {show("partner") && (
        <Card eyebrow={`Estado de ${partner?.display_name ?? "mi pareja"}`} icon={<Sparkles className="size-4" strokeWidth={1.5} />} tint="bg-sage-soft text-sage">
          {ps && (ps.mood || ps.activity || ps.custom_status) ? (
            <div className="space-y-2">
              {ps.mood && <p className="text-[17px]">{ps.mood}</p>}
              {ps.activity && <p className="text-[14px] text-muted-foreground">{ps.activity}</p>}
              {ps.custom_status && (
                <p className="rounded-2xl bg-secondary/60 px-4 py-3 text-[14px] italic text-muted-foreground">“{ps.custom_status}”</p>
              )}
              {ps.updated_at && <p className="text-[11px] text-faint">{timeAgo(ps.updated_at)}</p>}
            </div>
          ) : (
            <Empty text="Todavía no ha compartido cómo está." />
          )}
          <button onClick={() => setEditStatus(true)} className="press mt-4 w-full rounded-2xl bg-secondary py-2.5 text-[13px]">
            Actualizar mi estado
          </button>
        </Card>
      )}

      {show("cycle") && <CycleCard partnerName={partner?.display_name} enabled={!!ps?.shares_cycle} />}

      {show("location") && <LocationCard enabled={!!ps?.shares_location} />}

      {show("question") && (
        <section className="fade-up rounded-[1.75rem] bg-blush-soft p-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 size-28 rounded-full bg-blush/20" />
          <div className="relative">
            <p className="eyebrow flex items-center gap-2 text-accent-foreground">
              <MessageCircleHeart className="size-4" strokeWidth={1.5} /> Pregunta del día
            </p>
            <p className="mt-3 font-display text-[23px] leading-snug text-balance">{questionOfTheDay()}</p>
          </div>
        </section>
      )}

      {show("memory") && (
        <Card eyebrow="Recuerdo" icon={<ImageIcon className="size-4" strokeWidth={1.5} />} tint="bg-sand text-muted-foreground">
          <Empty text="Cuando guardéis fotos y momentos, alguno aparecerá aquí de vez en cuando." />
        </Card>
      )}

      <DateSheet open={editDate} onClose={() => setEditDate(false)} current={data?.startedOn ?? ""} />
      <StatusSheet open={editStatus} onClose={() => setEditStatus(false)} />
    </div>
  );
}

function CycleCard({ partnerName, enabled }: { partnerName: string | undefined; enabled: boolean }) {
  const { data: pc } = usePartnerCycle(enabled);
  const days = daysUntil(pc?.last_period_start ?? null);
  return (
    <Card eyebrow="Ciclo" icon={<Moon className="size-4" strokeWidth={1.5} />} tint="bg-sand text-muted-foreground">
      {!enabled ? (
        <Empty text="Solo se mostrará si tu pareja decide compartirlo." />
      ) : !pc?.shares_dates ? (
        <Empty text={`${partnerName ?? "Tu pareja"} aún no comparte las fechas de su ciclo.`} />
      ) : pc.last_period_start ? (
        <div className="space-y-1">
          <p className="text-[17px]">Último periodo: {displayDate(pc.last_period_start)}</p>
          {days !== null && days >= 0 && (
            <p className="text-[13px] text-muted-foreground">Empezó hace {days} {days === 1 ? "día" : "días"}</p>
          )}
          {pc.shares_symptoms && pc.recent_symptoms && pc.recent_symptoms.length > 0 && (
            <p className="text-[13px] text-muted-foreground">Síntomas recientes: {pc.recent_symptoms.join(", ")}</p>
          )}
          {pc.shares_symptoms && pc.recent_mood && (
            <p className="text-[13px] text-muted-foreground">Ánimo: {pc.recent_mood}</p>
          )}
          <p className="text-[11px] text-faint">Estimaciones orientativas, nunca un diagnóstico.</p>
        </div>
      ) : (
        <Empty text="Aún no hay registros suficientes." />
      )}
      <Link to="/ciclo" className="mt-3 inline-flex items-center gap-1 text-[13px] text-primary">
        Ver ciclo <ChevronRight className="size-3.5" />
      </Link>
    </Card>
  );
}

function LocationCard({ enabled }: { enabled: boolean }) {
  const { data: pl } = usePartnerLocation(enabled);
  return (
    <Card eyebrow="Ubicación" icon={<MapPin className="size-4" strokeWidth={1.5} />} tint="bg-sage-soft text-sage">
      {!enabled ? (
        <Empty text="Ubicación no compartida por ahora." />
      ) : pl ? (
        <div className="space-y-1">
          <p className="text-[17px]">Ubicación compartida</p>
          <p className="text-[13px] text-muted-foreground">Actualizada {timeAgo(pl.updated_at)}</p>
        </div>
      ) : (
        <Empty text="Tu pareja la comparte, pero aún no hay una actualización reciente." />
      )}
      <Link to="/ubicacion" className="mt-3 inline-flex items-center gap-1 text-[13px] text-primary">
        Ver mapa <ChevronRight className="size-3.5" />
      </Link>
    </Card>
  );
}

function Card({ eyebrow, icon, tint, children }: { eyebrow: string; icon: ReactNode; tint: string; children: ReactNode }) {
  return (
    <section className="card-soft fade-up p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`grid size-8 place-items-center rounded-xl ${tint}`}>{icon}</span>
        <p className="eyebrow">{eyebrow}</p>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-[14px] text-muted-foreground text-pretty">{text}</p>;
}

function NoPartner({ name }: { name?: string | undefined }) {
  return (
    <div className="pt-4">
      <p className="text-[13px] tracking-wide text-muted-foreground">Hola{name ? `, ${name}` : ""}</p>
      <h1 className="mt-2 text-[34px] leading-[1.05]">Vuestro espacio <span className="italic text-primary">os espera</span></h1>
      <Link to="/pareja" className="press fade-up mt-6 block rounded-[1.75rem] bg-blush-soft p-5">
        <p className="font-display text-[24px] leading-tight">Conecta con tu pareja</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Crea un código o introduce el suyo.</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Empezar <ChevronRight className="size-4" /></span>
      </Link>
    </div>
  );
}

function DateSheet({ open, onClose, current }: { open: boolean; onClose: () => void; current: string }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(current);
  const today = new Date().toISOString().slice(0, 10);
  async function save(value: string | null) {
    if (value && value > today) { toast.error("La fecha no puede ser futura"); return; }
    const { error } = await supabase.rpc("set_couple_start", { _date: value as string });
    if (error) { toast.error("No se pudo guardar"); return; }
    await qc.invalidateQueries({ queryKey: ["couple"] });
    onClose();
  }
  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-center text-[26px]">¿Cuándo empezó lo vuestro?</h2>
      <p className="mt-1 text-center text-sm text-muted-foreground">Los dos veréis el mismo contador.</p>
      <input type="date" max={today} value={date || current} onChange={(e) => setDate(e.target.value)}
        className="mt-5 w-full rounded-2xl bg-muted px-4 py-3.5 text-center text-[16px] outline-none focus:ring-2 ring-ring/50" />
      <button onClick={() => save(date || current || null)} className="press mt-4 w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground">Guardar</button>
      <button onClick={onClose} className="press mt-2 w-full py-3 text-[15px] text-muted-foreground">Cancelar</button>
    </BottomSheet>
  );
}

function StatusSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const uid = useAuth().session?.user.id;
  const qc = useQueryClient();
  const { data: mine } = useMyStatus();
  const [mood, setMood] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [custom, setCustom] = useState<string | null>(null);
  const m = mood ?? mine?.mood ?? "";
  const a = activity ?? mine?.activity ?? "";
  const c = custom ?? mine?.custom_status ?? "";

  async function save() {
    const { error } = await supabase.from("user_status").upsert({
      user_id: uid!, mood: m || null, activity: a.trim().slice(0, 60) || null, custom_status: c.trim().slice(0, 120) || null,
    });
    if (error) { toast.error("No se pudo guardar"); return; }
    qc.invalidateQueries({ queryKey: ["my-status"] });
    toast.success("Estado actualizado");
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-[26px]">¿Cómo estás?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tu pareja solo verá lo que tengas activado en Ajustes.</p>
      <p className="eyebrow mt-5">Ánimo</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MOODS.map((x) => (
          <button key={x} onClick={() => setMood(m === x ? "" : x)}
            className={`press rounded-full px-3.5 py-2 text-[13px] ${m === x ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{x}</button>
        ))}
      </div>
      <label className="mt-5 block">
        <span className="eyebrow">Actividad</span>
        <input value={a} maxLength={60} onChange={(e) => setActivity(e.target.value)} placeholder="Trabajando, en el gym…"
          className="mt-1.5 w-full rounded-2xl bg-muted px-4 py-3 text-[15px] outline-none focus:ring-2 ring-ring/50" />
      </label>
      <label className="mt-3 block">
        <span className="eyebrow">Estado personalizado</span>
        <input value={c} maxLength={120} onChange={(e) => setCustom(e.target.value)} placeholder="Pensando en ti"
          className="mt-1.5 w-full rounded-2xl bg-muted px-4 py-3 text-[15px] outline-none focus:ring-2 ring-ring/50" />
      </label>
      <button onClick={save} className="press mt-5 w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground">Guardar</button>
    </BottomSheet>
  );
}
