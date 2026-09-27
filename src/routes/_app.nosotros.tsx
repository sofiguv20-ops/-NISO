import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/PageHeader";

export const Route = createFileRoute("/_app/nosotros")({
  head: () => ({ meta: [{ title: "Nosotros — NISO" }, { name: "description", content: "Notas, recuerdos y pequeños rituales para los dos." }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader eyebrow="Nosotros" title="Lo vuestro" />
      <ComingSoon text="Notas, recuerdos y pequeños rituales para los dos." />
    </div>
  );
}
