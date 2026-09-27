import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="fade-up">
      {eyebrow && <p className="text-[13px] tracking-wide text-muted-foreground">{eyebrow}</p>}
      <h1 className="mt-2 text-[34px] leading-[1.05] text-balance">{title}</h1>
      {children}
    </header>
  );
}

export function ComingSoon({ text }: { text: string }) {
  return (
    <div className="card-soft fade-up mt-6 p-6 text-center">
      <p className="font-display text-xl">Muy pronto</p>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">{text}</p>
    </div>
  );
}
