import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, HeartOff, LogOut, UserRound, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCouple } from "@/lib/couple";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_app/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes — NISO" }, { name: "description", content: "Tu perfil, tu pareja y tu privacidad." }] }),
  component: Ajustes,
});

function Ajustes() {
  const { data } = useCouple();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function unlink() {
    setBusy(true);
    const { error } = await supabase.rpc("leave_couple");
    setBusy(false);
    setConfirm(false);
    if (error) { toast.error("No se pudo desvincular"); return; }
    await qc.invalidateQueries({ queryKey: ["couple"] });
    toast.success("Pareja desvinculada");
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const me = data?.me;
  return (
    <div>
      <PageHeader eyebrow="Ajustes" title="Tu espacio" />

      <Link to="/perfil" className="card-soft press fade-up mt-6 flex items-center gap-4 p-4">
        <Avatar path={me?.avatar_path} name={me?.display_name} className="size-14 text-xl" />
        <div className="flex-1">
          <p className="text-[16px] font-medium">{me?.display_name}</p>
          <p className="text-[12px] text-muted-foreground">{me?.pronouns || "Editar perfil"}</p>
        </div>
        <ChevronRight className="size-4 text-faint" />
      </Link>

      <p className="eyebrow mt-8 mb-3">Pareja</p>
      <div className="card-soft divide-y overflow-hidden">
        {data?.partner ? (
          <>
            <div className="flex items-center gap-3 p-4">
              <Heart className="size-5 text-primary" strokeWidth={1.5} />
              <p className="flex-1 text-[15px]">Vinculada/o con {data.partner.display_name}</p>
            </div>
            <button onClick={() => setConfirm(true)} className="press flex w-full items-center gap-3 p-4 text-left text-destructive">
              <HeartOff className="size-5" strokeWidth={1.5} />
              <span className="flex-1 text-[15px]">Desvincular pareja</span>
            </button>
          </>
        ) : (
          <Link to="/pareja" className="press flex items-center gap-3 p-4">
            <Heart className="size-5 text-primary" strokeWidth={1.5} />
            <span className="flex-1 text-[15px]">Conectar con mi pareja</span>
            <ChevronRight className="size-4 text-faint" />
          </Link>
        )}
      </div>

      <p className="eyebrow mt-8 mb-3">Cuenta</p>
      <div className="card-soft divide-y overflow-hidden">
        <Link to="/perfil" className="press flex items-center gap-3 p-4">
          <UserRound className="size-5 text-muted-foreground" strokeWidth={1.5} />
          <span className="flex-1 text-[15px]">Perfil</span>
          <ChevronRight className="size-4 text-faint" />
        </Link>
        <button onClick={signOut} className="press flex w-full items-center gap-3 p-4 text-left">
          <LogOut className="size-5 text-muted-foreground" strokeWidth={1.5} />
          <span className="flex-1 text-[15px]">Cerrar sesión</span>
        </button>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/20 backdrop-blur-sm sm:place-items-center" onClick={() => setConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="fade-up w-full max-w-md rounded-t-[2rem] bg-card p-7 pb-[max(env(safe-area-inset-bottom),1.75rem)] text-center sm:rounded-[2rem]">
            <h2 className="text-[26px] leading-tight">¿Desvincular pareja?</h2>
            <p className="mt-2 text-sm text-muted-foreground text-pretty">
              Dejaréis de compartir vuestro espacio privado y ninguno podrá ver la información del otro. Podréis volver a vincularos con un nuevo código.
            </p>
            <button disabled={busy} onClick={unlink} className="press mt-6 w-full rounded-2xl bg-destructive py-3.5 text-[15px] font-medium text-destructive-foreground disabled:opacity-60">
              Sí, desvincular
            </button>
            <button onClick={() => setConfirm(false)} className="press mt-2 w-full rounded-2xl py-3 text-[15px] text-muted-foreground">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
