import type { ReactNode } from "react";

export function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/20 backdrop-blur-sm sm:place-items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-up max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-card p-7 pb-[max(env(safe-area-inset-bottom),1.75rem)] sm:rounded-[2rem]"
      >
        {children}
      </div>
    </div>
  );
}
