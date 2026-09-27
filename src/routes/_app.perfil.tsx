import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCouple } from "@/lib/couple";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { Field } from "./auth";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({ meta: [{ title: "Mi perfil — NISO" }, { name: "description", content: "Edita tu perfil." }] }),
  component: Perfil,
});

const schema = z.object({
  display_name: z.string().trim().min(1, "Añade tu nombre").max(60),
  pronouns: z.string().trim().max(30),
  birthdate: z.string().refine((v) => !v || !isNaN(Date.parse(v)), "Fecha no válida"),
});

function Perfil() {
  const { data } = useCouple();
  const { session } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data?.me) return;
    setName(data.me.display_name);
    setPronouns(data.me.pronouns ?? "");
    setBirthdate(data.me.birthdate ?? "");
  }, [data?.me]);

  async function save() {
    const p = schema.safeParse({ display_name: name, pronouns, birthdate });
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Revisa los datos"); return; }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: p.data.display_name, pronouns: p.data.pronouns || null, birthdate: p.data.birthdate || null })
      .eq("id", session!.user.id);
    setBusy(false);
    if (error) { toast.error("No se pudo guardar"); return; }
    qc.invalidateQueries({ queryKey: ["couple"] });
    toast.success("Perfil guardado");
  }

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Elige una imagen"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5 MB"); return; }
    const uid = session!.user.id;
    const path = `${uid}/${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("No se pudo subir la foto"); return; }
    const old = data?.me?.avatar_path;
    await supabase.from("profiles").update({ avatar_path: path }).eq("id", uid);
    if (old) supabase.storage.from("avatars").remove([old]);
    qc.invalidateQueries({ queryKey: ["couple"] });
    toast.success("Foto actualizada");
  }

  return (
    <div>
      <PageHeader eyebrow="Perfil" title="Sobre ti" />
      <div className="fade-up mt-6 flex flex-col items-center">
        <button onClick={() => fileRef.current?.click()} className="press relative">
          <Avatar path={data?.me?.avatar_path} name={name} className="size-28 text-4xl" />
          <span className="absolute right-0 bottom-0 grid size-9 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-background">
            <Camera className="size-4" strokeWidth={1.5} />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <p className="mt-3 text-[12px] text-muted-foreground">Solo tu pareja puede verla</p>
      </div>

      <div className="card-soft fade-up mt-6 space-y-3 p-5">
        <Field label="Nombre" value={name} onChange={setName} />
        <Field label="Pronombres (opcional)" value={pronouns} onChange={setPronouns} placeholder="ella, él, elle…" />
        <Field label="Fecha de nacimiento (opcional)" type="date" value={birthdate} onChange={setBirthdate} />
        <button disabled={busy} onClick={save} className="press mt-2 w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:opacity-60">
          Guardar
        </button>
      </div>
    </div>
  );
}
