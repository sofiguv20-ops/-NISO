import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Droplets, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { BottomSheet } from "@/components/Sheet";
import { dateKey, displayDate, monthGrid, parseDateKey, startOfMonth } from "@/lib/calendar";
import { saveSettings, useSettings } from "@/lib/home";
import {
  CYCLE_MOODS,
  FLOWS,
  SYMPTOMS,
  buildPeriods,
  daysUntil,
  deleteCycleDay,
  estimate,
  phaseLabel,
  saveCycleDay,
  useCycleDays,
  type CycleDay,
  type CycleDayDraft,
  type Flow,
} from "@/lib/cycle";

export const Route = createFileRoute("/_app/ciclo")({
  head: () => ({
    meta: [
      { title: "Mi ciclo — NISO" },
      { name: "description", content: "Un seguimiento personal y privado; tú eliges qué ve tu pareja." },
      { property: "og:title", content: "Mi ciclo — NISO" },
      { property: "og:description", content: "Registra tu ciclo y decide qué compartes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function emptyDraft(day: string): CycleDayDraft {
  return { day, flow: null, pain: null, mood: null, energy: null, sleep_hours: null, symptoms: [], notes: null };
}

function Page() {
  const uid = useAuth().session?.user.id;
  const qc = useQueryClient();
  const { data: days } = useCycleDays();
  const { data: settings } = useSettings();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [draft, setDraft] = useState<CycleDayDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const byDay = useMemo(() => {
    const map = new Map<string, CycleDay>();
    for (const d of days ?? []) map.set(d.day, d);
    return map;
  }, [days]);

  const periods = useMemo(() => buildPeriods(days ?? []), [days]);
  const est = useMemo(() => estimate(periods), [periods]);
  const phase = phaseLabel(est, periods);
  const today = dateKey(new Date());
  const grid = monthGrid(month);

  function open(day: string) {
    const existing = byDay.get(day);
    setDraft(
      existing
        ? {
            day,
            flow: existing.flow,
            pain: existing.pain,
            mood: existing.mood,
            energy: existing.energy,
            sleep_hours: existing.sleep_hours,
            symptoms: existing.symptoms ?? [],
            notes: existing.notes,
          }
        : emptyDraft(day),
    );
  }

  async function save() {
    if (!uid || !draft) return;
    setBusy(true);
    const { error } = await saveCycleDay(uid, draft);
    setBusy(false);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["cycle-days"] });
    setDraft(null);
    toast.success("Registro guardado");
  }

  async function remove() {
    if (!uid || !draft) return;
    setBusy(true);
    const { error } = await deleteCycleDay(uid, draft.day);
    setBusy(false);
    if (error) {
      toast.error("No se pudo borrar");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["cycle-days"] });
    setDraft(null);
    toast.success("Registro eliminado");
  }

  async function toggleShare(patch: Record<string, boolean>) {
    if (!uid) return;
    const { error } = await saveSettings(uid, patch);
    if (error) {
      toast.error("No se pudo actualizar");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["settings"] });
  }

  const untilNext = daysUntil(est.nextPeriod);

  return (
    <div>
      <PageHeader eyebrow="Mi ciclo" title="Tu ritmo" />

      <section className="card-soft fade-up mt-6 p-5">
        <p className="eyebrow">Hoy</p>
        <p className="mt-1 font-display text-[26px] leading-tight">
          {phase ?? <span className="italic text-primary">Empieza a registrar</span>}
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {est.dayOfCycle
            ? `Día ${est.dayOfCycle} de tu ciclo`
            : "Marca los días de menstruación para calcular tus ciclos."}
        </p>
        <button
          onClick={() => open(today)}
          className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground"
        >
          <Plus className="size-4" /> Registrar hoy
        </button>
      </section>

      <section className="card-soft fade-up mt-4 p-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="press rounded-full p-2">
            <ChevronLeft className="size-4" />
          </button>
          <p className="font-display text-[19px] capitalize">
            {month.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
          </p>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="press rounded-full p-2">
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 text-center text-[11px] text-faint">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((date) => {
            const key = dateKey(date);
            const entry = byDay.get(key);
            const inMonth = date.getMonth() === month.getMonth();
            const isFertile = !!est.fertileFrom && !!est.fertileTo && key >= est.fertileFrom && key <= est.fertileTo;
            const isNext = est.nextPeriod === key;
            const isOvulation = est.ovulation === key;
            return (
              <button
                key={key}
                onClick={() => open(key)}
                className={[
                  "press relative grid aspect-square place-items-center rounded-2xl text-[13px]",
                  inMonth ? "" : "text-faint/60",
                  entry?.flow ? "bg-primary text-primary-foreground" : isFertile ? "bg-sage-soft" : "",
                  key === today && !entry?.flow ? "ring-1 ring-primary" : "",
                ].join(" ")}
              >
                {date.getDate()}
                {!entry?.flow && (isNext || isOvulation) && (
                  <span
                    className={`absolute bottom-1 size-1.5 rounded-full ${isNext ? "bg-primary/60" : "bg-sage"}`}
                  />
                )}
                {!entry?.flow && entry && (
                  <span className="absolute bottom-1 size-1.5 rounded-full bg-muted-foreground/50" />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <Legend className="bg-primary" label="Menstruación" />
          <Legend className="bg-sage-soft" label="Ventana fértil (estimada)" />
          <Legend className="bg-primary/60" label="Próxima regla (estimada)" />
        </div>
      </section>

      <section className="card-soft fade-up mt-4 p-5">
        <p className="eyebrow">Estimaciones</p>
        {est.nextPeriod ? (
          <div className="mt-2 space-y-1.5 text-[14px]">
            <p>
              Próxima menstruación: <span className="text-primary">{displayDate(est.nextPeriod)}</span>
              {untilNext !== null && untilNext >= 0 ? ` · en ${untilNext} ${untilNext === 1 ? "día" : "días"}` : ""}
            </p>
            {est.ovulation && <p>Ovulación estimada: {displayDate(est.ovulation)}</p>}
            {est.fertileFrom && est.fertileTo && (
              <p>
                Ventana fértil: {displayDate(est.fertileFrom)} – {displayDate(est.fertileTo)}
              </p>
            )}
            <p className="text-muted-foreground">
              Ciclo medio {est.cycleLength} días · regla media {est.periodLength} días
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[14px] text-muted-foreground text-pretty">
            Necesitamos al menos dos menstruaciones registradas para estimar tus próximas fechas.
            {periods.length === 1 ? " Ya tienes una." : ""}
          </p>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-faint text-pretty">
          Son estimaciones basadas en tus registros. No son un diagnóstico médico ni un método anticonceptivo.
        </p>
      </section>

      <p className="eyebrow mt-8 mb-3">Qué comparte tu pareja</p>
      <div className="card-soft divide-y overflow-hidden">
        <Toggle
          label="Mi fase del ciclo"
          hint="Verá en qué fase estás, sin detalles."
          checked={!!settings?.share_cycle_phase}
          onChange={(v) => toggleShare({ share_cycle_phase: v })}
        />
        <Toggle
          label="Fechas de mi menstruación"
          hint="Verá el inicio y fin de tu última regla."
          checked={!!settings?.share_cycle_dates}
          onChange={(v) => toggleShare({ share_cycle_dates: v })}
        />
        <Toggle
          label="Síntomas y ánimo"
          hint="Verá tu último registro de síntomas y ánimo."
          checked={!!settings?.share_cycle_symptoms}
          onChange={(v) => toggleShare({ share_cycle_symptoms: v })}
        />
      </div>

      <p className="eyebrow mt-8 mb-3">Historial</p>
      {periods.length === 0 ? (
        <div className="card-soft p-5 text-[14px] text-muted-foreground">Aún no has registrado ninguna menstruación.</div>
      ) : (
        <div className="card-soft divide-y overflow-hidden">
          {periods.slice(0, 12).map((p) => (
            <div key={p.start} className="flex items-center gap-3 p-4">
              <Droplets className="size-4 text-primary" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-[14px]">
                  {displayDate(p.start)} – {displayDate(p.end)}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {p.days} {p.days === 1 ? "día" : "días"} · {parseDateKey(p.start).getFullYear()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="eyebrow mt-8 mb-3">Últimos registros</p>
      {(days ?? []).length === 0 ? (
        <div className="card-soft p-5 text-[14px] text-muted-foreground">Todavía no hay registros diarios.</div>
      ) : (
        <div className="card-soft divide-y overflow-hidden">
          {(days ?? []).slice(0, 10).map((d) => (
            <button key={d.day} onClick={() => open(d.day)} className="press flex w-full items-center gap-3 p-4 text-left">
              <div className="flex-1">
                <p className="text-[14px] capitalize">{displayDate(d.day)}</p>
                <p className="text-[12px] text-muted-foreground">
                  {[
                    d.flow ? FLOWS.find((f) => f.value === d.flow)?.label : null,
                    d.mood,
                    d.pain !== null ? `Dolor ${d.pain}/5` : null,
                    d.energy !== null ? `Energía ${d.energy}/5` : null,
                    d.sleep_hours !== null ? `${d.sleep_hours} h de sueño` : null,
                    d.symptoms?.length ? `${d.symptoms.length} síntomas` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sin detalles"}
                </p>
              </div>
              <ChevronRight className="size-4 text-faint" />
            </button>
          ))}
        </div>
      )}

      <BottomSheet open={!!draft} onClose={() => setDraft(null)}>
        {draft && (
          <div className="space-y-5">
            <div>
              <p className="eyebrow">Registro</p>
              <h2 className="font-display text-[26px] capitalize leading-tight">{displayDate(draft.day)}</h2>
            </div>

            <Group label="Menstruación">
              <div className="flex flex-wrap gap-2">
                <Chip active={draft.flow === null} onClick={() => setDraft({ ...draft, flow: null })} label="Sin sangrado" />
                {FLOWS.map((f) => (
                  <Chip
                    key={f.value}
                    active={draft.flow === f.value}
                    onClick={() => setDraft({ ...draft, flow: f.value as Flow })}
                    label={f.label}
                  />
                ))}
              </div>
            </Group>

            <Scale label="Dolor" value={draft.pain} onChange={(v) => setDraft({ ...draft, pain: v })} />
            <Scale label="Energía" value={draft.energy} onChange={(v) => setDraft({ ...draft, energy: v })} />

            <Group label="Ánimo">
              <div className="flex flex-wrap gap-2">
                {CYCLE_MOODS.map((m) => (
                  <Chip
                    key={m}
                    active={draft.mood === m}
                    onClick={() => setDraft({ ...draft, mood: draft.mood === m ? null : m })}
                    label={m}
                  />
                ))}
              </div>
            </Group>

            <Group label="Horas de sueño">
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={draft.sleep_hours ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, sleep_hours: e.target.value === "" ? null : Number(e.target.value) })
                }
                className="w-full rounded-2xl bg-muted px-4 py-3 text-[15px] outline-none ring-ring/50 transition focus:ring-2"
                placeholder="7.5"
              />
            </Group>

            <Group label="Síntomas">
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map((s) => {
                  const active = draft.symptoms.includes(s);
                  return (
                    <Chip
                      key={s}
                      active={active}
                      label={s}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          symptoms: active ? draft.symptoms.filter((x) => x !== s) : [...draft.symptoms, s],
                        })
                      }
                    />
                  );
                })}
              </div>
            </Group>

            <Group label="Notas">
              <textarea
                value={draft.notes ?? ""}
                maxLength={1000}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
                rows={3}
                className="w-full rounded-2xl bg-muted px-4 py-3 text-[15px] outline-none ring-ring/50 transition focus:ring-2"
                placeholder="Cómo te has sentido hoy"
              />
            </Group>

            <button
              disabled={busy}
              onClick={save}
              className="press w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:opacity-60"
            >
              Guardar
            </button>
            {byDay.has(draft.day) && (
              <button
                disabled={busy}
                onClick={remove}
                className="press flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[14px] text-destructive"
              >
                <Trash2 className="size-4" /> Borrar este registro
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full ${className}`} /> {label}
    </span>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press rounded-full px-3.5 py-2 text-[13px] ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
    >
      {label}
    </button>
  );
}

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <Group label={`${label}${value !== null ? ` · ${value}/5` : ""}`}>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={`press h-10 flex-1 rounded-2xl text-[13px] ${value === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {n}
          </button>
        ))}
      </div>
    </Group>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button onClick={() => onChange(!checked)} className="press flex w-full items-center gap-3 p-4 text-left">
      <div className="flex-1">
        <p className="text-[15px]">{label}</p>
        <p className="text-[12px] text-muted-foreground">{hint}</p>
      </div>
      <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`size-5 rounded-full bg-card shadow transition ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}
