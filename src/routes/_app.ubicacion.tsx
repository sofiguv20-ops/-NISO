import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LocateFixed, MapPin, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCouple } from "@/lib/couple";
import { PageHeader } from "@/components/PageHeader";
import { saveSettings, timeAgo, useSettings } from "@/lib/home";
import {
  clearMyLocation,
  distanceKm,
  readDeviceLocation,
  saveMyLocation,
  useMyLocation,
  usePartnerLocation,
} from "@/lib/location";
import type { MapPoint } from "@/components/CoupleMap";

const CoupleMap = lazy(() => import("@/components/CoupleMap"));

export const Route = createFileRoute("/_app/ubicacion")({
  head: () => ({
    meta: [
      { title: "Ubicación — NISO" },
      { name: "description", content: "Comparte dónde estás con tu pareja, solo cuando tú quieras." },
      { property: "og:title", content: "Ubicación — NISO" },
      { property: "og:description", content: "Comparte dónde estás con tu pareja, solo cuando tú quieras." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const uid = useAuth().session?.user.id;
  const qc = useQueryClient();
  const { data: couple } = useCouple();
  const { data: settings } = useSettings();
  const { data: mine } = useMyLocation();
  const { data: partnerLoc } = usePartnerLocation(!!couple?.partner);
  const [busy, setBusy] = useState(false);

  const sharing = !!settings?.share_location;

  async function updateNow(silent = false) {
    if (!uid) return;
    setBusy(true);
    try {
      const pos = await readDeviceLocation();
      const { error } = await saveMyLocation(uid, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["my-location"] });
      if (!silent) toast.success("Ubicación actualizada");
    } catch (error) {
      const code = (error as GeolocationPositionError)?.code;
      if (code === 1) toast.error("Necesitamos tu permiso de ubicación en el navegador");
      else if (code === 3) toast.error("No hemos podido obtener tu ubicación a tiempo");
      else toast.error("No se pudo obtener tu ubicación");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSharing() {
    if (!uid) return;
    const next = !sharing;
    const { error } = await saveSettings(uid, { share_location: next });
    if (error) {
      toast.error("No se pudo actualizar");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["settings"] });
    if (next) {
      await updateNow(true);
      toast.success("Tu pareja ya puede ver dónde estás");
    } else {
      await clearMyLocation(uid);
      await qc.invalidateQueries({ queryKey: ["my-location"] });
      toast.success("Has dejado de compartir tu ubicación");
    }
  }

  const points: MapPoint[] = [];
  if (mine) points.push({ latitude: mine.latitude, longitude: mine.longitude, label: "Tú", tone: "me" });
  if (partnerLoc)
    points.push({
      latitude: partnerLoc.latitude,
      longitude: partnerLoc.longitude,
      label: couple?.partner?.display_name ?? "Tu pareja",
      tone: "partner",
    });

  const apart = mine && partnerLoc ? distanceKm(mine, partnerLoc) : null;

  return (
    <div>
      <PageHeader eyebrow="Ubicación" title="Cerca, siempre" />

      <section className="card-soft fade-up mt-6 overflow-hidden">
        <div className="h-64 w-full bg-muted">
          {points.length > 0 ? (
            <ClientOnly fallback={<MapFallback text="Cargando mapa…" />}>
              <Suspense fallback={<MapFallback text="Cargando mapa…" />}>
                <CoupleMap points={points} />
              </Suspense>
            </ClientOnly>
          ) : (
            <MapFallback text="Aún no hay ninguna ubicación que mostrar" />
          )}
        </div>
        <div className="space-y-1 p-5">
          <p className="text-[15px]">
            {mine ? `Tu ubicación se actualizó ${timeAgo(mine.updated_at)}` : "Todavía no has compartido tu ubicación"}
          </p>
          {partnerLoc ? (
            <p className="text-[13px] text-muted-foreground">
              {couple?.partner?.display_name ?? "Tu pareja"} · {timeAgo(partnerLoc.updated_at)}
              {apart !== null
                ? ` · ${apart < 1 ? `a ${Math.round(apart * 1000)} m` : `a ${apart.toFixed(1)} km`} de ti`
                : ""}
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              {couple?.partner
                ? `${couple.partner.display_name} no está compartiendo su ubicación ahora mismo.`
                : "Conecta con tu pareja para veros en el mapa."}
            </p>
          )}
          <button
            disabled={busy}
            onClick={() => updateNow()}
            className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:opacity-60"
          >
            <LocateFixed className="size-4" /> {busy ? "Buscando…" : "Actualizar mi ubicación"}
          </button>
        </div>
      </section>

      <div className="card-soft mt-4 overflow-hidden">
        <button onClick={toggleSharing} className="press flex w-full items-center gap-3 p-4 text-left">
          <MapPin className="size-5 text-primary" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="text-[15px]">Compartir mi ubicación</p>
            <p className="text-[12px] text-muted-foreground">
              {sharing ? "Solo tu pareja vinculada puede verla." : "Nadie puede ver dónde estás."}
            </p>
          </div>
          <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${sharing ? "bg-primary" : "bg-muted"}`}>
            <span className={`size-5 rounded-full bg-card shadow transition ${sharing ? "translate-x-5" : ""}`} />
          </span>
        </button>
      </div>

      <div className="card-soft mt-4 flex gap-3 p-5">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sage" strokeWidth={1.5} />
        <p className="text-[13px] leading-relaxed text-muted-foreground text-pretty">
          Tu ubicación solo se guarda cuando la actualizas tú, y se borra en cuanto desactivas el uso compartido. No
          guardamos historial ni hay seguimiento en segundo plano.
        </p>
      </div>
    </div>
  );
}

function MapFallback({ text }: { text: string }) {
  return <div className="grid h-full place-items-center text-[13px] text-muted-foreground">{text}</div>;
}
