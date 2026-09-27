import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Dices, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCouple } from "@/lib/couple";
import { PageHeader } from "@/components/PageHeader";
import { KINDS, useSpaceItems } from "@/lib/space";

export const Route = createFileRoute("/_app/citas")({
  head: () => ({ meta: [{ title: "Generador de citas — NISO" }, { name: "description", content: "Ideas aleatorias de citas para los dos." }] }),
  component: Page,
});

const IDEAS: Record<string, string[]> = {
  home: ["Noche de cine con palomitas caseras", "Cocinar juntos una receta nueva", "Fuerte de mantas y juegos de mesa", "Cata de vinos o zumos en casa", "Noche de karaoke en el salón", "Spa casero con mascarillas", "Pintar un cuadro a cuatro manos", "Maratón de vuestra serie favorita", "Hacer un puzzle grande", "Escribir cartas para abrir dentro de un año", "Cena a la luz de las velas en casa", "Construir una playlist juntos"],
  out: ["Paseo al atardecer por un sitio nuevo", "Visitar un museo", "Ir a un concierto pequeño", "Excursión de un día", "Mercadillo de fin de semana", "Mirador para ver las estrellas", "Ir al cine de verano", "Bolera o minigolf", "Ruta en bici", "Visitar un pueblo cercano"],
  food: ["Probar un restaurante de otra cultura", "Ruta de tapas", "Desayuno en una cafetería bonita", "Picnic en el parque", "Clase de cocina", "Food trucks", "Buscar la mejor pizza de la ciudad", "Heladería nueva"],
  romantic: ["Recrear vuestra primera cita", "Cena sorpresa con código de vestimenta", "Baile lento en casa con vuestra canción", "Escapada de una noche", "Leer en voz alta el uno al otro", "Baño con velas y música", "Picnic nocturno con mantas"],
  fun: ["Escape room", "Recreativos o karting", "Competición de cocina con jueces imaginarios", "Parque de atracciones", "Juego de preguntas sobre el otro", "Noche de videojuegos cooperativos", "Clase de baile de prueba"],
  cheap: ["Paseo y helado", "Picnic con lo que haya en casa", "Ver el amanecer", "Ruta de senderismo", "Biblioteca y elegir libros el uno para el otro", "Día sin móviles", "Sesión de fotos juntos por la ciudad"],
};

const RECENT_KEY = "niso-recent-ideas";

function Page() {
  const uid = useAuth().session?.user.id;
  const { data: couple } = useCouple();
  const { data: saved } = useSpaceItems("idea");
  const qc = useQueryClient();
  const cats = KINDS.idea.categories!;
  const [cat, setCat] = useState<string>("all");
  const [idea, setIdea] = useState<{ text: string; cat: string } | null>(null);

  function generate() {
    const pool = (cat === "all" ? Object.entries(IDEAS) : [[cat, IDEAS[cat]!] as const])
      .flatMap(([c, list]) => list.map((text) => ({ text, cat: c })));
    let recent: string[] = [];
    try { recent = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { /* ignore */ }
    const savedTitles = new Set((saved ?? []).map((s) => s.title));
    let options = pool.filter((p) => !recent.includes(p.text) && p.text !== idea?.text);
    if (options.length === 0) { recent = []; options = pool.filter((p) => p.text !== idea?.text); }
    const fresh = options.filter((p) => !savedTitles.has(p.text));
    const pick = (fresh.length ? fresh : options)[Math.floor(Math.random() * (fresh.length || options.length))]!;
    setIdea(pick);
    localStorage.setItem(RECENT_KEY, JSON.stringify([pick.text, ...recent].slice(0, Math.floor(pool.length * 0.7))));
  }

  async function save() {
    if (!idea || !uid || !couple?.coupleId) return;
    if (saved?.some((s) => s.title === idea.text)) { toast("Ya está en vuestras citas guardadas"); return; }
    const { error } = await supabase.from("space_items").insert({
      kind: "idea", title: idea.text, category: idea.cat, couple_id: couple.coupleId, created_by: uid, favorite: true,
    });
    if (error) { toast.error("No se pudo guardar"); return; }
    qc.invalidateQueries({ queryKey: ["space-items"] });
    toast.success("Guardada en citas favoritas");
  }

  return (
    <div>
      <Link to="/nosotros" className="press -ml-1 mb-3 inline-flex items-center gap-1 text-[14px] text-muted-foreground"><ChevronLeft className="size-4" /> Nuestro espacio</Link>
      <PageHeader eyebrow="Generador de citas" title="¿Qué hacemos hoy?" />
      <div className="mt-5 flex flex-wrap gap-2">
        {[{ value: "all", label: "Todas" }, ...cats].map((c) => (
          <button key={c.value} onClick={() => setCat(c.value)}
            className={`press rounded-full px-3.5 py-2 text-[13px] ${cat === c.value ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{c.label}</button>
        ))}
      </div>
      <div className="fade-up mt-6 grid min-h-40 place-items-center rounded-[1.75rem] bg-blush-soft p-6 text-center">
        {idea ? (
          <div>
            <p className="eyebrow text-accent-foreground">{cats.find((c) => c.value === idea.cat)?.label}</p>
            <p className="mt-2 font-display text-[26px] leading-snug text-balance">{idea.text}</p>
          </div>
        ) : <p className="text-muted-foreground">Pulsa el dado para una idea</p>}
      </div>
      <div className="mt-4 flex gap-3">
        <button onClick={generate} className="press flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground"><Dices className="size-5" /> {idea ? "Otra idea" : "Generar"}</button>
        {idea && <button onClick={save} className="press flex items-center justify-center gap-2 rounded-2xl bg-muted px-5 text-[15px]"><Heart className="size-4" /> Guardar</button>}
      </div>
      <Link to="/espacio/$kind" params={{ kind: "idea" }} className="press mt-4 block text-center text-sm text-primary">Ver citas guardadas ({saved?.length ?? 0})</Link>
    </div>
  );
}
