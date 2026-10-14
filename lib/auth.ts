import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isAdminUser } from "@/lib/admin";
import type { UserProfile } from "@/lib/types";

export async function getCurrentUserAndProfile() {
  if (!isSupabaseConfigured()) {
    return {
      user: null,
      profile: null as UserProfile | null,
      configured: false,
      isAdmin: false,
    };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      profile: null as UserProfile | null,
      configured: true,
      isAdmin: false,
    };
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
    isAdmin: isAdminUser(user),
  };
}
