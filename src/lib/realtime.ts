import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TABLES: Record<string, string[][]> = {
  couple_events: [["calendar-events"]],
  couples: [["couple"], ["our-space"]],
  couple_members: [["couple"], ["partner-status"], ["partner-cycle"], ["partner-location"]],
  profiles: [["couple"]],
  user_status: [["my-status"], ["partner-status"]],
  user_settings: [["settings"], ["partner-status"], ["partner-cycle"], ["partner-location"]],
  user_locations: [["partner-location"], ["my-location"]],
  cycle_days: [["cycle-days"], ["partner-cycle"]],
  space_items: [["space-items"]],
  checkins: [["checkins"]],
  daily_answers: [["daily-answers"]],
};

/** Keeps both partners in sync: any change refreshes the affected screens. */
export function useRealtimeSync(uid: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!uid) return;
    const channel = supabase.channel(`niso-sync-${uid}`);
    for (const [table, keys] of Object.entries(TABLES)) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        keys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      });
    }
    channel.subscribe();
    const onFocus = () => qc.invalidateQueries();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [uid, qc]);
}
