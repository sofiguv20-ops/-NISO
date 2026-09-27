import { useEffect } from "react";
import { toast } from "sonner";
import { useSettings } from "@/lib/home";
import { useSpaceItems } from "@/lib/space";

const SENT_KEY = "niso-notified";

export function useTheme() {
  const { data } = useSettings();
  const theme = (data as { theme?: string } | undefined)?.theme ?? "light";
  useEffect(() => {
    const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, [theme]);
}

async function show(title: string, body: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png" });
    new Notification(title, { body, icon: "/icon-192.png" });
  } catch { /* ignore */ }
}

/** Fires reminders (and today's important dates) as phone notifications while NISO is open or in background. */
export function useReminderNotifier(uid: string | undefined) {
  const { data: settings } = useSettings();
  const { data: items } = useSpaceItems();
  useEffect(() => {
    if (!uid || !items) return;
    const s = settings as { notifications_enabled?: boolean; notify_kinds?: string[] } | undefined;
    const kinds = new Set(s?.notify_kinds ?? []);
    const check = () => {
      let sent: string[] = [];
      try { sent = JSON.parse(localStorage.getItem(SENT_KEY) || "[]"); } catch { /* ignore */ }
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const due: { key: string; title: string; body: string }[] = [];
      for (const i of items) {
        if (i.kind === "reminder" && !i.done && i.item_date && kinds.has(i.category ?? "custom")) {
          const at = new Date(`${i.item_date}T${i.item_time ?? "09:00"}`);
          if (at <= now && now.getTime() - at.getTime() < 3 * 86400000) due.push({ key: `r-${i.id}-${i.item_date}`, title: `🔔 ${i.title}`, body: i.body ?? "Recordatorio de NISO" });
        }
        if (i.kind === "date" && i.item_date && i.item_date.slice(5) === today.slice(5) && kinds.has(i.category === "birthday" ? "birthday" : i.category === "anniversary" ? "anniversary" : "date")) {
          due.push({ key: `d-${i.id}-${today}`, title: `💕 Hoy: ${i.title || "fecha especial"}`, body: "Una fecha importante para los dos." });
        }
      }
      const fresh = due.filter((d) => !sent.includes(d.key));
      if (!fresh.length) return;
      for (const d of fresh) {
        toast(d.title, { description: d.body });
        if (s?.notifications_enabled && typeof Notification !== "undefined" && Notification.permission === "granted") show(d.title, d.body);
      }
      localStorage.setItem(SENT_KEY, JSON.stringify([...fresh.map((d) => d.key), ...sent].slice(0, 300)));
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [uid, items, settings]);
}
