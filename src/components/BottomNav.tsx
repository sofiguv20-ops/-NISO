import { Link } from "@tanstack/react-router";
import { Home, CalendarDays, Moon, MapPin, Heart, Settings } from "lucide-react";

const tabs = [
  { to: "/inicio", label: "Inicio", icon: Home },
  { to: "/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/ciclo", label: "Mi ciclo", icon: Moon },
  { to: "/ubicacion", label: "Ubicación", icon: MapPin },
  { to: "/nosotros", label: "Nosotros", icon: Heart },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pt-2 pb-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="press group flex flex-1 flex-col items-center gap-1 py-1 text-faint"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="size-5" strokeWidth={1.5} />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
