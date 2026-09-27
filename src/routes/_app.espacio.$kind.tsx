import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SpaceList } from "@/components/SpaceList";
import { KINDS, isKind } from "@/lib/space";

export const Route = createFileRoute("/_app/espacio/$kind")({
  beforeLoad: ({ params }) => {
    if (!isKind(params.kind)) throw notFound();
  },
  head: ({ params }) => {
    const cfg = isKind(params.kind) ? KINDS[params.kind] : null;
    return { meta: [{ title: `${cfg?.title ?? "Nuestro espacio"} — NISO` }, { name: "description", content: cfg?.intro ?? "Nuestro espacio" }] };
  },
  notFoundComponent: () => <p className="mt-10 text-center text-muted-foreground">Sección no encontrada.</p>,
  component: Page,
});

function Page() {
  const { kind } = Route.useParams();
  if (!isKind(kind)) return null;
  return (
    <div>
      <Link to="/nosotros" className="press -ml-1 mb-3 inline-flex items-center gap-1 text-[14px] text-muted-foreground">
        <ChevronLeft className="size-4" /> Nuestro espacio
      </Link>
      <PageHeader title={KINDS[kind].title} />
      <SpaceList key={kind} kind={kind} />
    </div>
  );
}
