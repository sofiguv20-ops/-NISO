import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Bell,
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  Repeat2,
  Trash2,
  X,
} from "lucide-react";
import { BottomSheet } from "@/components/Sheet";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCouple, type Profile } from "@/lib/couple";
import {
  EVENT_TYPES,
  RECURRENCES,
  REMINDERS,
  addDays,
  dateKey,
  displayDate,
  expandEvents,
  monthGrid,
  recurrenceLabel,
  startOfMonth,
  startOfWeek,
  timeLabel,
  useCalendarEvents,
  type CalendarEvent,
  type CalendarOccurrence,
  type EventAudience,
  type EventDraft,
  type EventType,
  type Recurrence,
} from "@/lib/calendar";

export const Route = createFileRoute("/_app/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario — NISO" },
      {
        name: "description",
        content: "Organizad vuestros planes, citas y recordatorios en un mismo lugar.",
      },
    ],
  }),
  component: CalendarPage,
});

type ViewMode = "month" | "week";

const fieldClass =
  "mt-1.5 w-full rounded-2xl bg-muted px-4 py-3 text-[15px] outline-none transition focus:ring-2 focus:ring-ring/50";
const iconButtonClass =
  "press grid size-10 place-items-center rounded-full bg-card text-muted-foreground shadow-sm ring-1 ring-border/70";
const today = dateKey(new Date());

function CalendarPage() {
  const { session } = useAuth();
  const { data: couple, isLoading: coupleLoading } = useCouple();
  const { data: events = [], isLoading } = useCalendarEvents();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted",
  );
  const notified = useRef(new Set<string>());

  const gridDays = useMemo(() => monthGrid(cursor), [cursor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor), index)),
    [cursor],
  );
  const visibleFrom = view === "month" ? gridDays[0]! : weekDays[0]!;
  const visibleTo = view === "month" ? gridDays[41]! : weekDays[6]!;
  const visibleEvents = useMemo(
    () => expandEvents(events, visibleFrom, visibleTo),
    [events, visibleFrom, visibleTo],
  );
  const upcomingEvents = useMemo(
    () => expandEvents(events, new Date(), addDays(new Date(), 90)).slice(0, 5),
    [events],
  );
  const selectedEvents = visibleEvents.filter((event) => event.occurrence_date === selectedDate);
  const partner = couple?.partner ?? null;
  const me = couple?.me ?? null;
  const canUseCalendar = !!couple?.coupleId;

  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      for (const event of upcomingEvents) {
        if (event.reminder_minutes === null || notified.current.has(event.occurrence_id)) continue;
        const eventTime = new Date(
          `${event.occurrence_date}T${event.all_day ? "09:00" : `${timeLabel(event.start_time) || "09:00"}:00`}`,
        ).getTime();
        const dueIn = eventTime - now;
        if (dueIn <= event.reminder_minutes * 60_000 && dueIn >= -60_000) {
          notified.current.add(event.occurrence_id);
          toast.info(`Próximo: ${event.title}`, {
            description: event.all_day
              ? displayDate(event.occurrence_date)
              : timeLabel(event.start_time),
          });
          if (notificationsEnabled && "Notification" in window) {
            new Notification(`NISO · ${event.title}`, {
              body: event.all_day
                ? displayDate(event.occurrence_date)
                : `A las ${timeLabel(event.start_time)}`,
            });
          }
        }
      }
    };
    checkReminders();
    const interval = window.setInterval(checkReminders, 60_000);
    return () => window.clearInterval(interval);
  }, [notificationsEnabled, upcomingEvents]);

  function moveCursor(amount: number) {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(next.getMonth() + amount);
    else next.setDate(next.getDate() + amount * 7);
    setCursor(next);
    setSelectedDate(dateKey(view === "month" ? startOfMonth(next) : startOfWeek(next)));
  }

  function openCreate(date = selectedDate) {
    setSelectedDate(date);
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(event: CalendarOccurrence) {
    setSelectedDate(event.occurrence_date);
    setEditing(event);
    setSheetOpen(true);
  }

  async function removeEvent(event: CalendarEvent) {
    if (!window.confirm(`¿Eliminar “${event.title}”?`)) return;
    const { error } = await supabase.from("couple_events").delete().eq("id", event.id);
    if (error) {
      toast.error("No se pudo eliminar el evento");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    toast.success("Evento eliminado");
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      toast.error("Este navegador no admite notificaciones");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      toast.success("Avisos activados");
    } else {
      toast.info("Puedes activarlos desde los ajustes del navegador");
    }
  }

  if (coupleLoading)
    return (
      <div className="grid min-h-[60dvh] place-items-center font-display text-2xl italic text-primary">
        cargando…
      </div>
    );

  if (!canUseCalendar) {
    return (
      <div>
        <PageHeader
          eyebrow="Calendario"
          title={
            <>
              Un espacio para <span className="italic text-primary">lo vuestro</span>
            </>
          }
        />
        <section className="card-soft fade-up mt-6 p-6">
          <CalendarDays className="size-7 text-primary" strokeWidth={1.4} />
          <h2 className="mt-5 text-[25px] leading-tight">Primero conecta con tu pareja</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Cuando estéis vinculados podréis organizar planes, citas y recordatorios en un mismo
            calendario.
          </p>
          <Link
            to="/pareja"
            className="press mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Conectar con mi pareja
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Calendario" title="Vuestros planes">
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              className={iconButtonClass}
              onClick={() => moveCursor(-1)}
              aria-label="Periodo anterior"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              className={iconButtonClass}
              onClick={() => moveCursor(1)}
              aria-label="Periodo siguiente"
            >
              <ChevronRight className="size-5" />
            </button>
            <button
              onClick={() => {
                setCursor(new Date());
                setSelectedDate(today);
              }}
              className="press rounded-full bg-secondary px-3.5 py-2 text-[12px]"
            >
              Hoy
            </button>
          </div>
          <button
            onClick={requestNotifications}
            className="press flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-[12px]"
            title="Activar avisos"
          >
            {notificationsEnabled ? (
              <BellRing className="size-3.5 text-primary" />
            ) : (
              <Bell className="size-3.5" />
            )}
            {notificationsEnabled ? "Avisos activos" : "Activar avisos"}
          </button>
        </div>
      </PageHeader>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-[25px] capitalize">
          {view === "month"
            ? cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
            : `${weekDays[0]!.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} — ${weekDays[6]!.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`}
        </h2>
        <div className="flex rounded-full bg-secondary p-1 text-[12px]">
          <button
            onClick={() => setView("month")}
            className={`rounded-full px-3 py-1.5 ${view === "month" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            Mes
          </button>
          <button
            onClick={() => setView("week")}
            className={`rounded-full px-3 py-1.5 ${view === "week" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            Semana
          </button>
        </div>
      </div>

      <section className="card-soft overflow-hidden p-3">
        <CalendarLegend me={me} partner={partner} />
        {view === "month" ? (
          <MonthView
            days={gridDays}
            cursor={cursor}
            selectedDate={selectedDate}
            events={visibleEvents}
            meId={me?.id}
            onSelect={setSelectedDate}
            onEvent={openEdit}
          />
        ) : (
          <WeekView
            days={weekDays}
            selectedDate={selectedDate}
            events={visibleEvents}
            meId={me?.id}
            onSelect={setSelectedDate}
            onEvent={openEdit}
          />
        )}
      </section>

      <section className="card-soft fade-up p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">¿Estás libre?</p>
            <h2 className="mt-2 text-[24px] leading-tight">{displayDate(selectedDate)}</h2>
          </div>
          <span className="grid size-10 place-items-center rounded-2xl bg-sage-soft text-sage">
            <Clock3 className="size-5" strokeWidth={1.5} />
          </span>
        </div>
        {partner ? (
          (() => {
            const partnerBusy = selectedEvents.some(
              (event) => event.owner_id === partner.id || event.owner_id === null,
            );
            return (
              <div
                className={`mt-4 rounded-2xl px-4 py-3 text-[14px] ${partnerBusy ? "bg-blush-soft text-accent-foreground" : "bg-sage-soft text-sage"}`}
              >
                {partnerBusy
                  ? `${partner.display_name} tiene algo programado este día.`
                  : `${partner.display_name} no tiene nada guardado este día.`}
              </div>
            );
          })()
        ) : (
          <p className="mt-4 rounded-2xl bg-muted px-4 py-3 text-[14px] text-muted-foreground">
            Conecta con tu pareja para consultar su disponibilidad.
          </p>
        )}
        <button
          onClick={() => openCreate(selectedDate)}
          className="press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[14px] font-medium text-primary-foreground"
        >
          <Plus className="size-4" /> Añadir evento
        </button>
      </section>

      <section className="fade-up">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Próximos eventos</p>
          {isLoading && <span className="text-[11px] text-faint">Actualizando…</span>}
        </div>
        {upcomingEvents.length ? (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <EventRow
                key={event.occurrence_id}
                event={event}
                meId={me?.id}
                partner={partner}
                onClick={() => openEdit(event)}
              />
            ))}
          </div>
        ) : (
          <div className="card-soft p-5 text-center">
            <p className="font-display text-[20px]">Nada a la vista</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Los próximos planes aparecerán aquí.
            </p>
          </div>
        )}
      </section>

      <EventSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        event={editing}
        selectedDate={selectedDate}
        uid={session?.user.id ?? ""}
        coupleId={couple.coupleId!}
        me={me}
        partner={partner}
        onSaved={() => {
          setSheetOpen(false);
          queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
        }}
        onDelete={removeEvent}
      />
    </div>
  );
}

function CalendarLegend({
  me,
  partner,
}: {
  me: CalendarPageProps["me"];
  partner: CalendarPageProps["partner"];
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <i className="size-2 rounded-full bg-primary" />
        {me?.display_name || "Tú"}
      </span>
      {partner && (
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-sage" />
          {partner.display_name}
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <i className="size-2 rounded-full bg-foreground/35" />
        Los dos
      </span>
    </div>
  );
}

type CalendarPageProps = {
  me: Profile | null;
  partner: Profile | null;
};

function MonthView({
  days,
  cursor,
  selectedDate,
  events,
  meId,
  onSelect,
  onEvent,
}: {
  days: Date[];
  cursor: Date;
  selectedDate: string;
  events: CalendarOccurrence[];
  meId: string | undefined;
  onSelect: (date: string) => void;
  onEvent: (event: CalendarOccurrence) => void;
}) {
  const labels = ["L", "M", "X", "J", "V", "S", "D"];
  return (
    <div>
      <div className="grid grid-cols-7 pb-2 text-center text-[10px] font-medium text-faint">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl bg-border/60">
        {days.map((day) => {
          const key = dateKey(day);
          const dayEvents = events.filter((event) => event.occurrence_date === key);
          const outside = day.getMonth() !== cursor.getMonth();
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`min-h-[72px] bg-card p-1.5 text-left align-top transition hover:bg-muted/70 ${selectedDate === key ? "relative z-10 ring-2 ring-inset ring-primary" : ""} ${outside ? "opacity-45" : ""}`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-[12px] ${key === today ? "bg-primary font-medium text-primary-foreground" : ""}`}
              >
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((event) => (
                  <span
                    key={event.occurrence_id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEvent(event);
                    }}
                    className={`block truncate rounded-md px-1 py-0.5 text-[9px] leading-tight ${eventTone(event.owner_id, meId)}`}
                  >
                    {event.title}
                  </span>
                ))}
                {dayEvents.length > 2 && (
                  <span className="px-1 text-[9px] text-faint">+{dayEvents.length - 2}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  days,
  selectedDate,
  events,
  meId,
  onSelect,
  onEvent,
}: {
  days: Date[];
  selectedDate: string;
  events: CalendarOccurrence[];
  meId: string | undefined;
  onSelect: (date: string) => void;
  onEvent: (event: CalendarOccurrence) => void;
}) {
  return (
    <div className="space-y-1">
      {days.map((day) => {
        const key = dateKey(day);
        const dayEvents = events.filter((event) => event.occurrence_date === key);
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`w-full rounded-2xl p-3 text-left ${selectedDate === key ? "bg-blush-soft" : "hover:bg-muted"}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`grid size-10 shrink-0 place-items-center rounded-2xl ${key === today ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                <span className="text-[11px] uppercase">
                  {day.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "")}
                </span>
                <strong className="font-display text-[18px] font-normal">{day.getDate()}</strong>
              </div>
              <div className="min-w-0 flex-1">
                {dayEvents.length ? (
                  dayEvents.map((event) => (
                    <span
                      key={event.occurrence_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEvent(event);
                      }}
                      className="mb-1 flex items-center gap-2 text-[13px] last:mb-0"
                    >
                      <i
                        className={`size-2 shrink-0 rounded-full ${event.owner_id === null ? "bg-foreground/35" : event.owner_id === meId ? "bg-primary" : "bg-sage"}`}
                      />
                      <span className="truncate">{event.title}</span>
                      <small className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                        {event.all_day ? "Todo el día" : timeLabel(event.start_time)}
                      </small>
                    </span>
                  ))
                ) : (
                  <span className="text-[13px] text-faint">Sin planes</span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function eventTone(ownerId: string | null, meId?: string) {
  if (ownerId === null) return "bg-sand text-foreground";
  return ownerId === meId ? "bg-blush-soft text-accent-foreground" : "bg-sage-soft text-sage";
}

function EventRow({
  event,
  meId,
  partner,
  onClick,
}: {
  event: CalendarOccurrence;
  meId: string | undefined;
  partner: CalendarPageProps["partner"];
  onClick: () => void;
}) {
  const isBoth = event.owner_id === null;
  const isMe = event.owner_id === meId || (!event.owner_id && event.created_by === meId);
  const person = isBoth ? "Los dos" : isMe ? "Tú" : (partner?.display_name ?? "Tu pareja");
  return (
    <button
      onClick={onClick}
      className="card-soft press flex w-full items-center gap-3 p-3.5 text-left"
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-2xl text-[16px] ${isBoth ? "bg-sand" : isMe ? "bg-blush-soft text-primary" : "bg-sage-soft text-sage"}`}
      >
        {EVENT_TYPES.find((type) => type.value === event.event_type)?.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">{event.title}</span>
        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          {person} · {displayDate(event.occurrence_date)}{" "}
          {event.all_day ? "· Todo el día" : `· ${timeLabel(event.start_time)}`}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </button>
  );
}

function EventSheet({
  open,
  onClose,
  event,
  selectedDate,
  uid,
  coupleId,
  me,
  partner,
  onSaved,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  selectedDate: string;
  uid: string;
  coupleId: string;
  me: CalendarPageProps["me"];
  partner: CalendarPageProps["partner"];
  onSaved: () => void;
  onDelete: (event: CalendarEvent) => void;
}) {
  const [form, setForm] = useState<EventDraft>(() => blankEvent(selectedDate, uid));
  const [audience, setAudience] = useState<EventAudience>("me");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setForm({
        title: event.title,
        event_type: event.event_type,
        starts_on: event.starts_on,
        start_time: event.start_time?.slice(0, 5) ?? null,
        end_time: event.end_time?.slice(0, 5) ?? null,
        all_day: event.all_day,
        owner_id: event.owner_id,
        location: event.location,
        notes: event.notes,
        reminder_minutes: event.reminder_minutes,
        recurrence: event.recurrence,
      });
      setAudience(event.owner_id === null ? "both" : event.owner_id === uid ? "me" : "partner");
    } else {
      setForm(blankEvent(selectedDate, uid));
      setAudience("me");
    }
  }, [event, open, selectedDate, uid]);

  function change<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.starts_on) {
      toast.error("Añade un título y una fecha");
      return;
    }
    if (!form.all_day && form.start_time && form.end_time && form.end_time < form.start_time) {
      toast.error("La hora final debe ser posterior");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      event_type: form.event_type,
      starts_on: form.starts_on,
      start_time: form.all_day ? null : form.start_time || null,
      end_time: form.all_day ? null : form.end_time || null,
      all_day: form.all_day,
      owner_id: audience === "both" ? null : audience === "me" ? uid : (partner?.id ?? uid),
      location: form.location?.trim() || null,
      notes: form.notes?.trim() || null,
      reminder_minutes: form.reminder_minutes,
      recurrence: form.recurrence,
    };
    const result = event
      ? await supabase.from("couple_events").update(payload).eq("id", event.id)
      : await supabase
          .from("couple_events")
          .insert({ ...payload, couple_id: coupleId, created_by: uid });
    setSaving(false);
    if (result.error) {
      toast.error("No se pudo guardar el evento");
      return;
    }
    toast.success(event ? "Evento actualizado" : "Evento creado");
    onSaved();
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{event ? "Editar evento" : "Nuevo evento"}</p>
          <h2 className="mt-2 text-[27px] leading-tight">
            {event ? event.title : "¿Qué tenéis en mente?"}
          </h2>
        </div>
        <button onClick={onClose} className={iconButtonClass} aria-label="Cerrar">
          <X className="size-4" />
        </button>
      </div>
      <form onSubmit={save} className="mt-6 space-y-4">
        <label className="block">
          <span className="eyebrow">Título</span>
          <input
            autoFocus
            value={form.title}
            onChange={(e) => change("title", e.target.value)}
            maxLength={120}
            placeholder="Cena, clase de yoga…"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="eyebrow">Tipo</span>
          <select
            value={form.event_type}
            onChange={(e) => change("event_type", e.target.value as EventType)}
            className={fieldClass}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.emoji} {type.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="eyebrow">Fecha</span>
            <input
              type="date"
              value={form.starts_on}
              onChange={(e) => change("starts_on", e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex cursor-pointer items-end gap-2 rounded-2xl bg-muted px-3 py-3.5 text-[13px]">
            <input
              type="checkbox"
              checked={form.all_day}
              onChange={(e) => change("all_day", e.target.checked)}
              className="accent-primary"
            />{" "}
            Todo el día
          </label>
        </div>
        {!form.all_day && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="eyebrow">Empieza</span>
              <input
                type="time"
                value={form.start_time ?? ""}
                onChange={(e) => change("start_time", e.target.value || null)}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="eyebrow">Termina</span>
              <input
                type="time"
                value={form.end_time ?? ""}
                onChange={(e) => change("end_time", e.target.value || null)}
                className={fieldClass}
              />
            </label>
          </div>
        )}
        <fieldset>
          <legend className="eyebrow">¿De quién es?</legend>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <AudienceButton
              active={audience === "me"}
              onClick={() => setAudience("me")}
              label={me?.display_name || "Tú"}
              tone="me"
            />
            <AudienceButton
              active={audience === "partner"}
              onClick={() => setAudience("partner")}
              label={partner?.display_name || "Pareja"}
              tone="partner"
              disabled={!partner}
            />
            <AudienceButton
              active={audience === "both"}
              onClick={() => setAudience("both")}
              label="Los dos"
              tone="both"
              disabled={!partner}
            />
          </div>
        </fieldset>
        <label className="block">
          <span className="eyebrow">
            Ubicación <small className="normal-case tracking-normal">(opcional)</small>
          </span>
          <span className="relative block">
            <MapPin className="absolute left-3 top-3.5 size-4 text-faint" />
            <input
              value={form.location ?? ""}
              onChange={(e) => change("location", e.target.value)}
              maxLength={160}
              placeholder="Dónde será"
              className={`${fieldClass} pl-10`}
            />
          </span>
        </label>
        <label className="block">
          <span className="eyebrow">
            Notas <small className="normal-case tracking-normal">(opcional)</small>
          </span>
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => change("notes", e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Algo que queráis recordar…"
            className={`${fieldClass} resize-none`}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="eyebrow">Recordatorio</span>
            <select
              value={form.reminder_minutes === null ? "" : String(form.reminder_minutes)}
              onChange={(e) =>
                change("reminder_minutes", e.target.value === "" ? null : Number(e.target.value))
              }
              className={fieldClass}
            >
              {REMINDERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow">Repetición</span>
            <select
              value={form.recurrence}
              onChange={(e) => change("recurrence", e.target.value as Recurrence)}
              className={fieldClass}
            >
              {RECURRENCES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {form.recurrence !== "none" && (
          <p className="flex items-center gap-2 rounded-2xl bg-sand px-3.5 py-3 text-[12px] text-muted-foreground">
            <Repeat2 className="size-4 shrink-0" /> Se repetirá{" "}
            {recurrenceLabel(form.recurrence).toLowerCase()} desde esta fecha.
          </p>
        )}
        <button
          disabled={saving}
          className="press w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Guardando…" : event ? "Guardar cambios" : "Crear evento"}
        </button>
        {event && (
          <button
            type="button"
            onClick={() => onDelete(event)}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[14px] text-destructive"
          >
            <Trash2 className="size-4" /> Eliminar evento
          </button>
        )}
      </form>
    </BottomSheet>
  );
}

function AudienceButton({
  active,
  onClick,
  label,
  tone,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone: "me" | "partner" | "both";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`press rounded-2xl border px-2 py-2.5 text-[12px] transition ${active ? (tone === "me" ? "border-primary bg-blush-soft text-primary" : tone === "partner" ? "border-sage bg-sage-soft text-sage" : "border-foreground/25 bg-sand") : "border-transparent bg-muted text-muted-foreground"} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {label}
    </button>
  );
}

function blankEvent(selectedDate: string, uid: string): EventDraft {
  return {
    title: "",
    event_type: "plan",
    starts_on: selectedDate,
    start_time: "18:00",
    end_time: "19:00",
    all_day: false,
    owner_id: uid,
    location: null,
    notes: null,
    reminder_minutes: 30,
    recurrence: "none",
  };
}
