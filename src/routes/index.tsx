import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NISO — vuestro espacio privado" },
      { name: "description", content: "Un espacio privado para dos personas: organización, ciclo, ubicación y conexión." },
      { property: "og:title", content: "NISO — vuestro espacio privado" },
      { property: "og:description", content: "Un espacio privado para dos personas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    navigate({ to: session ? "/inicio" : "/auth", replace: true });
  }, [session, loading, navigate]);
  return (
    <div className="grid min-h-dvh place-items-center">
      <p className="font-display text-4xl italic text-primary fade-up">niso</p>
    </div>
  );
}
