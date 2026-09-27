import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Heart, ImagePlus, Lock, MailOpen, Mail, MapPin, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCouple } from "@/lib/couple";
import { BottomSheet } from "@/components/Sheet";
import {
  KINDS, categoryLabel, daysUntilYearly, formatDate, removeMedia, uploadMedia, useMediaUrl, useSpaceItems,
  type Kind, type SpaceItem,
} from "@/lib/space";

const inputCls = "w-full rounded-2xl bg-muted px-4 py-3.5 text-[16px] outline-none focus:ring-2 ring-ring/50";

export function SpaceList({ kind }: { kind: Kind }) {
  const cfg = KINDS[kind];
  const uid = useAuth().session?.user.id;
  const { data: couple } = useCouple();
  const { data: items, isLoading } = useSpaceItems(kind);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<SpaceItem | "new" | null>(null);
  const [opened, setOpened] = useState<SpaceItem | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "done" | "fav">("all");

  const refresh = () => qc.invalidateQueries({ queryKey: ["space-items"] });

  async function patch(item: SpaceItem, values: Partial<SpaceItem>) {
    const { error } = await supabase.from("space_items").update(values).eq("id", item.id);
    if (error) toast.error("No se pudo guardar");
    refresh();
  }

  async function openMessage(item: SpaceItem) {
    setOpened(item);
    if (!item.opened_at && item.created_by !== uid) await patch(item, { opened_at: new Date().toISOString() });
  }

  if (!couple?.partner && couple) {
    return <p className="card-soft mt-6 p-6 text-center text-sm text-muted-foreground">Vincula a tu pareja para usar esta sección.</p>;
  }

  let list = items ?? [];
  if (filter === "pending") list = list.filter((i) => !i.done);
  if (filter === "done") list = list.filter((i) => i.done);
  if (filter === "fav") list = list.filter((i) => i.favorite);
  if (kind === "date") list = [...list].sort((a, b) => daysUntilYearly(a.item_date!) - daysUntilYearly(b.item_date!));
  if (kind === "reminder" || kind === "task")
    list = [...list].sort((a, b) => Number(a.done) - Number(b.done) || (a.item_date ?? "9").localeCompare(b.item_date ?? "9"));

  const filters = [
    { v: "all", l: "Todo" },
    ...(cfg.checkable ? [{ v: "pending", l: "Pendientes" }, { v: "done", l: "Hechos" }] : []),
    ...(cfg.favoritable ? [{ v: "fav", l: "Favoritos" }] : []),
  ] as const;

  return (
    <div className="mt-5">
      <p className="text-sm text-muted-foreground">{cfg.intro}</p>
      {filters.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {filters.map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v as typeof filter)}
              className={`press shrink-0 rounded-full px-3.5 py-2 text-[13px] ${filter === f.v ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{f.l}</button>
          ))}
        </div>
      )}

      <button onClick={() => setEditing("new")} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground">
        <Plus className="size-4" /> Añadir {cfg.singular}
      </button>

      {isLoading ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : list.length === 0 ? (
        <p className="card-soft mt-6 p-6 text-center text-sm text-muted-foreground">Todavía no hay nada aquí.</p>
      ) : cfg.gallery ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {list.map((i) => <GalleryTile key={i.id} item={i} onClick={() => setEditing(i)} onFav={() => patch(i, { favorite: !i.favorite })} />)}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map((i) => (
            <div key={i.id} className="card-soft fade-up flex items-start gap-3 p-4">
              {cfg.checkable && (
                <button aria-label={i.done ? "Marcar pendiente" : "Marcar hecho"} onClick={() => patch(i, { done: !i.done })}
                  className={`press mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 ${i.done ? "border-primary bg-primary text-primary-foreground" : "border-faint"}`}>
                  {i.done && <Check className="size-3.5" />}
                </button>
              )}
              {cfg.openable && (
                <button onClick={() => openMessage(i)} aria-label="Abrir mensaje" className="press mt-0.5 text-primary">
                  {i.opened_at ? <MailOpen className="size-5" strokeWidth={1.5} /> : <Mail className="size-5" strokeWidth={1.5} />}
                </button>
              )}
              <button className="min-w-0 flex-1 text-left" onClick={() => (cfg.openable ? openMessage(i) : setEditing(i))}>
                <p className={`text-[15px] font-medium ${i.done ? "text-muted-foreground line-through" : ""}`}>
                  {i.title || categoryLabel(kind, i.category) || "Sin título"}
                </p>
                <Meta item={i} kind={kind} />
                {i.body && !cfg.openable && <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{i.body}</p>}
              </button>
              <div className="flex flex-col items-end gap-2">
                {cfg.favoritable && (
                  <button aria-label="Favorito" onClick={() => patch(i, { favorite: !i.favorite })} className="press">
                    <Heart className={`size-4 ${i.favorite ? "fill-primary text-primary" : "text-faint"}`} />
                  </button>
                )}
                {i.visibility === "private" && <Lock className="size-3.5 text-faint" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && couple?.coupleId && uid && (
        <ItemSheet kind={kind} item={editing === "new" ? null : editing} coupleId={couple.coupleId} uid={uid}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
      )}

      <BottomSheet open={!!opened} onClose={() => setOpened(null)}>
        {opened && (
          <div>
            <p className="eyebrow">{categoryLabel(kind, opened.category)}</p>
            <h2 className="mt-2 text-[27px] leading-tight">{opened.title || categoryLabel(kind, opened.category)}</h2>
            <p className="mt-4 whitespace-pre-wrap text-[16px] leading-relaxed">{opened.body}</p>
            {opened.created_by === uid && (
              <button onClick={() => { setEditing(opened); setOpened(null); }} className="press mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-muted py-3 text-[15px]">
                <Pencil className="size-4" /> Editar
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function Meta({ item, kind }: { item: SpaceItem; kind: Kind }) {
  const parts: string[] = [];
  const cat = item.title ? categoryLabel(kind, item.category) : null;
  if (cat) parts.push(cat);
  if (item.item_date) {
    if (kind === "date") {
      const d = daysUntilYearly(item.item_date);
      parts.push(`${formatDate(item.item_date)} · ${d === 0 ? "¡Hoy!" : `faltan ${d} días`}`);
    } else parts.push(formatDate(item.item_date));
  }
  if (item.item_time) parts.push(item.item_time.slice(0, 5));
  if (item.place) parts.push(item.place);
  if (!parts.length) return null;
  return <p className="mt-0.5 text-[12px] text-muted-foreground">{parts.join(" · ")}</p>;
}

function GalleryTile({ item, onClick, onFav }: { item: SpaceItem; onClick: () => void; onFav: () => void }) {
  const { data: url } = useMediaUrl(item.photo_path);
  return (
    <div className="fade-up relative overflow-hidden rounded-[1.25rem] bg-muted">
      <button onClick={onClick} className="block aspect-square w-full">
        {url ? <img src={url} alt={item.title || "Foto"} className="size-full object-cover" loading="lazy" />
          : <div className="grid size-full place-items-center p-3 text-center font-display text-lg">{item.title}</div>}
      </button>
      <button onClick={onFav} aria-label="Favorito" className="press absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-card/80 backdrop-blur">
        <Heart className={`size-4 ${item.favorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
      </button>
      {(item.title || item.item_date) && url && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/60 to-transparent p-2.5 pt-6 text-background">
          <p className="truncate text-[13px] font-medium">{item.title}</p>
          {item.item_date && <p className="text-[11px] opacity-90">{formatDate(item.item_date)}</p>}
        </div>
      )}
      {item.visibility === "private" && <Lock className="absolute left-2 top-2 size-4 text-background drop-shadow" />}
    </div>
  );
}

function ItemSheet({ kind, item, coupleId, uid, onClose, onSaved }: {
  kind: Kind; item: SpaceItem | null; coupleId: string; uid: string; onClose: () => void; onSaved: () => void;
}) {
  const cfg = KINDS[kind];
  const has = (f: string) => cfg.fields.includes(f as never);
  const mine = !item || item.created_by === uid;
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [category, setCategory] = useState(item?.category ?? cfg.categories?.[0]?.value ?? null);
  const [date, setDate] = useState(item?.item_date ?? "");
  const [time, setTime] = useState(item?.item_time?.slice(0, 5) ?? "");
  const [place, setPlace] = useState(item?.place ?? "");
  const [visibility, setVisibility] = useState<"private" | "shared">(item?.visibility ?? (cfg.defaultPrivate ? "private" : "shared"));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: existingUrl } = useMediaUrl(item?.photo_path);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const needsTitle = !has("category") || category === "custom" || kind === "wish" || kind === "idea" || kind === "reminder";
    if (needsTitle && !title.trim() && kind !== "photo") { toast.error("Escribe un título"); return; }
    if (has("body") && ["message", "for_when"].includes(kind) && !body.trim()) { toast.error("Escribe el mensaje"); return; }
    if (kind === "date" && !date) { toast.error("Elige la fecha"); return; }
    if (kind === "reminder" && !date) { toast.error("Elige el día"); return; }
    if (cfg.photoRequired && !file && !item?.photo_path) { toast.error("Elige una foto"); return; }
    setSaving(true);
    try {
      let photo_path = item?.photo_path ?? null;
      if (file) {
        photo_path = await uploadMedia(coupleId, uid, file);
        if (item?.photo_path) await removeMedia(item.photo_path);
      }
      const payload = {
        title: title.trim().slice(0, 200),
        body: body.trim() || null,
        category: has("category") ? category : null,
        item_date: date || null,
        item_time: time || null,
        place: place.trim() || null,
        photo_path,
        ...(mine ? { visibility } : {}),
      };
      const { error } = item
        ? await supabase.from("space_items").update(payload).eq("id", item.id)
        : await supabase.from("space_items").insert({ ...payload, kind, couple_id: coupleId, created_by: uid });
      if (error) throw error;
      toast.success(item ? "Guardado" : "Añadido");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error && err.message.length < 60 ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!item || !confirm("¿Eliminar definitivamente?")) return;
    const { error } = await supabase.from("space_items").delete().eq("id", item.id);
    if (error) { toast.error("No se pudo eliminar"); return; }
    await removeMedia(item.photo_path);
    toast.success("Eliminado");
    onSaved();
  }

  const img = preview ?? existingUrl;

  return (
    <BottomSheet open onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[26px] leading-tight">{item ? `Editar ${cfg.singular}` : `Nuevo ${cfg.singular}`}</h2>
        <button onClick={onClose} aria-label="Cerrar" className="press grid size-9 place-items-center rounded-full bg-muted"><X className="size-4" /></button>
      </div>
      <form onSubmit={save} className="mt-5 space-y-4">
        {has("photo") && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } }} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="press grid aspect-video w-full place-items-center overflow-hidden rounded-2xl bg-muted text-muted-foreground">
              {img ? <img src={img} alt="" className="size-full object-cover" /> : <span className="flex items-center gap-2 text-sm"><ImagePlus className="size-5" /> Elegir foto</span>}
            </button>
          </div>
        )}
        {has("category") && cfg.categories && (
          <label className="block">
            <span className="eyebrow">Tipo</span>
            <select value={category ?? ""} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} mt-2`}>
              {cfg.categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <span className="eyebrow">{cfg.titleLabel ?? "Título"}</span>
          <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={`${inputCls} mt-2`} />
        </label>
        {has("date") && (
          <div className="flex gap-3">
            <label className="block flex-1">
              <span className="eyebrow">{cfg.dateLabel ?? "Fecha"}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} mt-2`} />
            </label>
            {has("time") && (
              <label className="block w-32">
                <span className="eyebrow">Hora</span>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputCls} mt-2`} />
              </label>
            )}
          </div>
        )}
        {has("place") && (
          <label className="block">
            <span className="eyebrow flex items-center gap-1"><MapPin className="size-3" /> {cfg.placeLabel ?? "Lugar"}</span>
            <input value={place} maxLength={200} onChange={(e) => setPlace(e.target.value)} className={`${inputCls} mt-2`} />
          </label>
        )}
        {has("body") && (
          <label className="block">
            <span className="eyebrow">{cfg.bodyLabel ?? "Notas"}</span>
            <textarea value={body} maxLength={5000} rows={4} onChange={(e) => setBody(e.target.value)} className={`${inputCls} mt-2 resize-none`} />
          </label>
        )}
        {mine && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
            {([["shared", "Compartido", Users], ["private", "Solo para mí", Lock]] as const).map(([v, l, Icon]) => (
              <button key={v} type="button" onClick={() => setVisibility(v)}
                className={`press flex items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] ${visibility === v ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                <Icon className="size-4" /> {l}
              </button>
            ))}
          </div>
        )}
        <button disabled={saving} className="press w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:opacity-60">
          {saving ? "Guardando…" : "Guardar"}
        </button>
        {item && (
          <button type="button" onClick={remove} className="press flex w-full items-center justify-center gap-2 py-3 text-[15px] text-destructive">
            <Trash2 className="size-4" /> Eliminar
          </button>
        )}
      </form>
    </BottomSheet>
  );
}
