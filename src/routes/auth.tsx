import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — NISO" },
      { name: "description", content: "Inicia sesión o crea tu cuenta en NISO." },
      { property: "og:title", content: "Entrar — NISO" },
      { property: "og:description", content: "Inicia sesión o crea tu cuenta en NISO." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Email no válido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  name: z.string().trim().max(60).optional(),
});

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/inicio", replace: true });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, name: mode === "up" ? name : undefined });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Revisa los datos"); return; }
    if (mode === "up" && !name.trim()) { toast.error("Dinos cómo te llamas"); return; }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("Email o contraseña incorrectos");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } },
      });
      if (error) toast.error(error.message);
      else setSent(true);
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <div className="fade-up">
        <p className="font-display text-3xl italic text-primary">niso</p>
        <h1 className="mt-6 text-[38px] leading-[1.05]">
          Un lugar <span className="italic text-primary">solo para dos</span>
        </h1>
        <p className="mt-3 text-muted-foreground">Tú decides siempre qué compartes.</p>
      </div>

      {sent ? (
        <div className="card-soft fade-up mt-8 p-6 text-center">
          <p className="font-display text-xl">Revisa tu correo</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Te enviamos un enlace a {email} para confirmar tu cuenta.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="card-soft fade-up mt-8 space-y-3 p-5">
          {mode === "up" && (
            <Field label="Tu nombre" value={name} onChange={setName} autoComplete="given-name" />
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <Field
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />
          <button
            disabled={busy}
            className="press mt-2 w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-primary-foreground disabled:opacity-60"
          >
            {mode === "in" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>
      )}

      <button
        onClick={() => { setMode(mode === "in" ? "up" : "in"); setSent(false); }}
        className="mt-6 text-sm text-muted-foreground"
      >
        {mode === "in" ? "¿Aún no tienes cuenta? " : "¿Ya tienes cuenta? "}
        <span className="text-primary">{mode === "in" ? "Crear una" : "Entrar"}</span>
      </button>
    </div>
  );
}

export function Field({
  label, value, onChange, type = "text", autoComplete, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-2xl bg-muted px-4 py-3 text-[15px] outline-none ring-ring/50 transition focus:ring-2"
      />
    </label>
  );
}
