import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);
  if (loading || !session) {
    return <div className="grid min-h-dvh place-items-center font-display text-3xl italic text-primary">niso</div>;
  }
  return (
    <div className="min-h-dvh">
      <main className="mx-auto max-w-md px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-32">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
