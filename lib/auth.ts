import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { UserProfile } from "@/lib/types";

export async function getCurrentUserAndProfile() {
  if (!isSupabaseConfigured()) {
    return { user: null, profile: null as UserProfile | null, configured: false };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, profile: null as UserProfile | null, configured: true };
  }
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return {
    user,
    profile: (profile as UserProfile | null) ?? null,
    configured: true,
  };
}
