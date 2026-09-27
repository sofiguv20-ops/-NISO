import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Permanently deletes the signed-in user's account and all their data. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Leaving the couple removes the shared space (both agreed to share it).
    await supabase.rpc("leave_couple");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const bucket of ["avatars"]) {
      const { data } = await supabaseAdmin.storage.from(bucket).list(userId);
      if (data?.length) await supabaseAdmin.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("No se pudo eliminar la cuenta");
    return { ok: true };
  });
