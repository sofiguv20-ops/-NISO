import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type MyLocation = {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updated_at: string;
};

export type PartnerLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updated_at: string;
};

export function useMyLocation() {
  const uid = useAuth().session?.user.id;
  return useQuery({
    queryKey: ["my-location", uid],
    enabled: !!uid,
    queryFn: async (): Promise<MyLocation | null> => {
      const { data } = await supabase.from("user_locations").select("*").eq("user_id", uid!).maybeSingle();
      return (data as MyLocation) ?? null;
    },
  });
}

export function usePartnerLocation(enabled: boolean) {
  return useQuery({
    queryKey: ["partner-location"],
    enabled,
    refetchInterval: enabled ? 60000 : false,
    queryFn: async (): Promise<PartnerLocation | null> => {
      const { data } = await supabase.rpc("get_partner_location");
      return (data?.[0] as PartnerLocation) ?? null;
    },
  });
}

export async function saveMyLocation(
  uid: string,
  coords: { latitude: number; longitude: number; accuracy: number | null },
) {
  return supabase.from("user_locations").upsert({
    user_id: uid,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    updated_at: new Date().toISOString(),
  });
}

export async function clearMyLocation(uid: string) {
  return supabase.from("user_locations").delete().eq("user_id", uid);
}

export function readDeviceLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    });
  });
}

/** Rough straight-line distance in km between two points. */
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
