import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, useCouple } from "@/lib/couple";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_app/pareja")({
  head: () => ({ meta: [{ title: "Conectar pareja — NISO" }, { name: "description", content: "Crea o únete a tu pareja." }] }),
  component: Pareja,
});

function Pareja() {
  const { data } = useCouple();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [code, setCode] = useState("");
  const [confirmName, setConfirmName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const myCode = data?.inviteCode;

  if (data?.partner) {
    return (
      <div>
        <PageHeader eyebrow="Pareja" title={<>Ya estáis <span className="italic text-primary">vinculados</span></>} />
        <p className="mt-3 text-muted-foreground">Estás conectada/o con {data.partner.display_name}.</p>
      </div>
    );
  }

  async function createCode() {
    setBusy(true);
    const { error } = await supabase.rpc("create_couple");
    setBusy(false);
    if (error) { toast.error(friendlyError(error.message)); return; }
    qc.invalidateQueries({ queryKey: ["couple"] });
  }

  async function share() {
    const text = `Únete a mí en NISO con este código: ${myCode}`;
    if (navigator.share) await navigator.share({ text }).catch(() => {});
    else { await navigator.clipboard.writeText(myCode!); toast.success("Código copiado"); }
  }

  async function preview() {
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(c)) { toast.error("El código tiene 6 caracteres"); return; }
    setBusy(true);
    const { data: name, error } = await supabase.rpc("preview_invite", { _code: c });
    setBusy(false);
    if (error) { toast.error(friendlyError(error.message)); return; }
    setConfirmName(name || "tu pareja");
  }

  async function join() {
    setBusy(true);
    const { error } = await supabase.rpc("join_couple", { _code: code.trim().toUpperCase() });
    setBusy(false);
    if (error) { setConfirmName(null); { toast.error(friendlyError(error.message)); return; } }
    await qc.invalidateQueries({ queryKey: ["couple"] });
    toast.success("¡Ya estáis vinculados!");
    navigate({ to: "/inicio" });
  }

  return (
    <div>
      <PageHeader eyebrow="Vínculo de pareja" title={<>Vuestro <span className="italic text-primary">espacio privado</span></>}>
        <p className="mt-3 text-sm text-muted-foreground text-pretty">
          Cada persona comparte solo lo que elige. Nadie más tiene acceso.
        </p>
      </PageHeader>

      <div className="mt-6 grid grid-cols-2 rounded-2xl bg-muted p-1">
        {(["create", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`press rounded-xl py-2.5 text-sm transition ${tab === t ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
          >
            {t === "create" ? "Crear pareja" : "Unirme a mi pareja"}
          </button>
        ))}
      </div>

      {tab === "create" ? (
        <div className="card-soft fade-up mt-4 p-6 text-center">
          {myCode ? (
            <>
              <p className="eyebrow">Tu código</p>
              <p className="mt-3 rounded-2xl bg-background py-4 font-display text-3xl tracking-[0.35em] text-primary">{myCode}</p>
              <p className="mt-3 text-[13px] text-muted-foreground">Compártelo con tu pareja. Caduca en cuanto se use.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => { navigator.clipboard.writeText(myCode); toast.success("Código copiado"); }} className="press flex items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-sm">
                  <Copy className="size-4" strokeWidth={1.5} /> Copiar
                </button>
                <button onClick={share} className="press flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm text-primary-foreground">
                  <Share2 className="size-4" strokeWidth={1.5} /> Compartir
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-[24px]">Invita a tu pareja</h2>
              <p className="mt-2 text-[13px] text-muted-foreground">Generaremos un código único para vosotros.</p>
              <button disabled={busy} onClick={createCode} className="press mt-5 w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:opacity-60">
                Generar código
              </button>
            </>
          )}
          <p className="mt-4 text-[11px] text-faint">Solo una pareja por cuenta</p>
        </div>
      ) : (
        <div className="card-soft fade-up mt-4 p-6">
          <p className="eyebrow">Código de tu pareja</p>
          <input
            value={code}
            maxLength={6}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="mt-2 w-full rounded-2xl bg-muted py-4 text-center font-display text-3xl tracking-[0.35em] uppercase outline-none ring-ring/50 focus:ring-2"
          />
          <button disabled={busy} onClick={preview} className="press mt-4 w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:opacity-60">
            Continuar
          </button>
        </div>
      )}

      {confirmName && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/20 backdrop-blur-sm sm:place-items-center" onClick={() => setConfirmName(null)}>
          <div onClick={(e) => e.stopPropagation()} className="fade-up w-full max-w-md rounded-t-[2rem] bg-card p-7 pb-[max(env(safe-area-inset-bottom),1.75rem)] text-center sm:rounded-[2rem]">
            <div className="mx-auto size-16 rounded-full bg-blush-soft grid place-items-center font-display text-2xl text-primary">
              {confirmName.charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-4 text-[26px] leading-tight text-balance">¿Quieres vincularte con {confirmName}?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Compartiréis un espacio privado. Podrás desvincularte cuando quieras desde Ajustes.</p>
            <button disabled={busy} onClick={join} className="press mt-6 w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:opacity-60">
              Sí, vincularnos
            </button>
            <button onClick={() => setConfirmName(null)} className="press mt-2 w-full rounded-2xl py-3 text-[15px] text-muted-foreground">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
