import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarHeart, Camera, ChevronRight, Dices, Gift, Heart, ListChecks, Mail, MapPin, MessageCircleHeart,
  Music, Pencil, Bell, Sparkles, SmilePlus, Images,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCouple } from "@/lib/couple";
import { PageHeader } from "@/components/PageHeader";
import { BottomSheet } from "@/components/Sheet";
import { formatDate, timeTogether, type Kind } from "@/lib/space";

export const Route = createFileRoute("/_app/nosotros")({
  head: () => ({ meta: [{ title: "Nuestro espacio — NISO" }, { name: "description", content: "Vuestra relación, recuerdos, mensajes y planes." }] }),
  component: Page,
});

type OurSpace = { met_on: string | null; started_on: string | null; song_title: string | null; song_artist: string | null; song_url: string | null };

export function useOurSpace() {
  const { data: couple } = useCouple();
  return useQuery({
    queryKey: ["our-space", couple?.coupleId],
    enabled: !!couple?.coupleId,
    queryFn: async (): Promise<OurSpace | null> => {
      const { data } = await supabase.from("couples").select("met_on, started_on, song_title, song_artist, song_url").eq("id", couple!.coupleId!).maybeSingle();
      return data as OurSpace | null;
    },
  });
}

const SECTIONS: { kind: Kind; label: string; icon: typeof Heart }[] = [
  { kind: "photo", label: "Fotos", icon: Camera },
  { kind: "memory", label: "Recuerdos", icon: Images },
  { kind: "place", label: "Lugares especiales", icon: MapPin },
  { kind: "date", label: "Fechas importantes", icon: CalendarHeart },
  { kind: "message", label: "Mensajes especiales", icon: Heart },
  { kind: "for_when", label: "Para cuando…", icon: Mail },
  { kind: "wish", label: "Wishlist", icon: Gift },
  { kind: "task", label: "Planes y tareas", icon: ListChecks },
  { kind: "reminder", label: "Recordatorios", icon: Bell },
];

function Page() {
  const { data: couple } = useCouple();
  const { data: space } = useOurSpace();
  const [edit, setEdit] = useState(false);

  if (couple && !couple.partner) {
    return (
      <div>
        <PageHeader eyebrow="Nuestro espacio" title="Lo vuestro" />
        <Link to="/pareja" className="card-soft press mt-6 flex items-center gap-3 p-5">
          <Heart className="size-5 text-primary" /> <span className="flex-1">Conecta con tu pareja para empezar</span> <ChevronRight className="size-4 text-faint" />
        </Link>
      </div>
    );
  }

  const t = space?.started_on ? timeTogether(space.started_on) : null;

  return (
    <div>
      <PageHeader eyebrow="Nuestro espacio" title={<>{couple?.me?.display_name} <span className="text-primary">&</span> {couple?.partner?.display_name}</>} />

      <section className="fade-up relative mt-6 overflow-hidden rounded-[1.75rem] bg-blush-soft p-5">
        <div className="absolute -right-8 -top-8 size-28 rounded-full bg-blush/20" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-accent-foreground">Nuestra relación</p>
            <button onClick={() => setEdit(true)} aria-label="Editar relación" className="press grid size-8 place-items-center rounded-full bg-card/70"><Pencil className="size-3.5" /></button>
          </div>
          {t ? (
            <>
              <p className="mt-3 font-display text-[40px] leading-none">{t.total.toLocaleString("es-ES")} <span className="text-[20px]">días juntos</span></p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t.years > 0 && `${t.years} ${t.years === 1 ? "año" : "años"}, `}{t.months} {t.months === 1 ? "mes" : "meses"} y {t.days} {t.days === 1 ? "día" : "días"}
              </p>
            </>
          ) : (
            <button onClick={() => setEdit(true)} className="mt-3 text-left font-display text-[22px] italic text-primary">Añade cuándo empezó lo vuestro</button>
          )}
          <div className="mt-4 space-y-1 text-[13px] text-muted-foreground">
            {space?.met_on && <p>Os conocisteis el {formatDate(space.met_on)}</p>}
            {space?.started_on && <p>Juntos desde el {formatDate(space.started_on)}</p>}
          </div>
          {space?.song_title && (
            <a href={space.song_url || undefined} target="_blank" rel="noreferrer" className="press mt-4 flex items-center gap-3 rounded-2xl bg-card/70 p-3">
              <Music className="size-5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{space.song_title}</p>
                {space.song_artist && <p className="truncate text-[12px] text-muted-foreground">{space.song_artist}</p>}
              </div>
            </a>
          )}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <QuickLink to="/checkin" label="Check-in" icon={SmilePlus} />
        <QuickLink to="/pregunta" label="Pregunta del día" icon={MessageCircleHeart} />
        <QuickLink to="/citas" label="Ideas de citas" icon={Dices} />
      </div>

      <div className="card-soft mt-4 divide-y overflow-hidden">
        {SECTIONS.map(({ kind, label, icon: Icon }) => (
          <Link key={kind} to="/espacio/$kind" params={{ kind }} className="press flex items-center gap-3 p-4">
            <Icon className="size-5 text-primary" strokeWidth={1.5} />
            <span className="flex-1 text-[15px]">{label}</span>
            <ChevronRight className="size-4 text-faint" />
          </Link>
        ))}
        <Link to="/espacio/$kind" params={{ kind: "idea" }} className="press flex items-center gap-3 p-4">
          <Sparkles className="size-5 text-primary" strokeWidth={1.5} />
          <span className="flex-1 text-[15px]">Citas guardadas</span>
          <ChevronRight className="size-4 text-faint" />
        </Link>
      </div>

      {edit && <EditSheet space={space ?? null} onClose={() => setEdit(false)} />}
    </div>
  );
}

function QuickLink({ to, label, icon: Icon }: { to: "/checkin" | "/pregunta" | "/citas"; label: string; icon: typeof Heart }) {
  return (
    <Link to={to} className="card-soft press flex flex-col items-center gap-2 p-4 text-center">
      <Icon className="size-6 text-primary" strokeWidth={1.5} />
      <span className="text-[12px] leading-tight">{label}</span>
    </Link>
  );
}

const inputCls = "mt-2 w-full rounded-2xl bg-muted px-4 py-3.5 text-[16px] outline-none focus:ring-2 ring-ring/50";

function EditSheet({ space, onClose }: { space: OurSpace | null; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [met, setMet] = useState(space?.met_on ?? "");
  const [start, setStart] = useState(space?.started_on ?? "");
  const [song, setSong] = useState(space?.song_title ?? "");
  const [artist, setArtist] = useState(space?.song_artist ?? "");
  const [url, setUrl] = useState(space?.song_url ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if ((met && met > today) || (start && start > today)) { toast.error("Las fechas no pueden ser futuras"); return; }
    if (url && !/^https?:\/\//i.test(url)) { toast.error("El enlace debe empezar por https://"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("update_our_space", {
      _met_on: (met || null) as string, _started_on: (start || null) as string,
      _song_title: song, _song_artist: artist, _song_url: url,
    });
    setBusy(false);
    if (error) { toast.error("No se pudo guardar"); return; }
    qc.invalidateQueries({ queryKey: ["our-space"] });
    qc.invalidateQueries({ queryKey: ["couple"] });
    toast.success("Guardado");
    onClose();
  }

  return (
    <BottomSheet open onClose={onClose}>
      <h2 className="text-[26px]">Nuestra relación</h2>
      <p className="mt-1 text-sm text-muted-foreground">Los dos veréis lo mismo.</p>
      <div className="mt-5 space-y-4">
        <label className="block"><span className="eyebrow">Nos conocimos</span><input type="date" max={today} value={met} onChange={(e) => setMet(e.target.value)} className={inputCls} /></label>
        <label className="block"><span className="eyebrow">Empezamos la relación</span><input type="date" max={today} value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} /></label>
        <label className="block"><span className="eyebrow">Nuestra canción</span><input value={song} maxLength={120} placeholder="Título" onChange={(e) => setSong(e.target.value)} className={inputCls} /></label>
        <input value={artist} maxLength={120} placeholder="Artista" onChange={(e) => setArtist(e.target.value)} className={inputCls} />
        <input value={url} maxLength={500} placeholder="Enlace (Spotify, YouTube…)" onChange={(e) => setUrl(e.target.value)} className={inputCls} />
        <button disabled={busy} onClick={save} className="press w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:opacity-60">Guardar</button>
      </div>
    </BottomSheet>
  );
}
