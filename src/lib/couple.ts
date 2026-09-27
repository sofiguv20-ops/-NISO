import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type Profile = {
  id: string;
  display_name: string;
  avatar_path: string | null;
  birthdate: string | null;
  pronouns: string | null;
};

export type CoupleState = {
  me: Profile | null;
  coupleId: string | null;
  inviteCode: string | null;
  startedOn: string | null;
  partner: Profile | null;
};

export function useCouple() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ["couple", uid],
    enabled: !!uid,
    queryFn: async (): Promise<CoupleState> => {
      const { data: me } = await supabase.from("profiles").select("*").eq("id", uid!).maybeSingle();
      const { data: membership } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", uid!)
        .maybeSingle();
      if (!membership) return { me, coupleId: null, inviteCode: null, startedOn: null, partner: null };
      const [{ data: couple }, { data: members }] = await Promise.all([
        supabase.from("couples").select("invite_code, started_on").eq("id", membership.couple_id).maybeSingle(),
        supabase.from("couple_members").select("user_id").eq("couple_id", membership.couple_id),
      ]);
      const partnerId = members?.find((m) => m.user_id !== uid)?.user_id;
      let partner: Profile | null = null;
      if (partnerId) {
        const { data } = await supabase.from("profiles").select("*").eq("id", partnerId).maybeSingle();
        partner = data;
      }
      return { me, coupleId: membership.couple_id, inviteCode: couple?.invite_code ?? null, startedOn: couple?.started_on ?? null, partner };
    },
  });
}

export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path!, 3600);
      return data?.signedUrl ?? null;
    },
  });
}

const errors: Record<string, string> = {
  invalid_code: "Ese código no existe o ya se usó.",
  couple_full: "Esa pareja ya tiene dos personas.",
  own_code: "Este es tu propio código. Compártelo con tu pareja.",
  already_linked: "Ya estás vinculada/o con una pareja.",
};
export function friendlyError(msg?: string) {
  const key = Object.keys(errors).find((k) => msg?.includes(k));
  return key ? errors[key] : "Algo no salió bien. Inténtalo de nuevo.";
}
