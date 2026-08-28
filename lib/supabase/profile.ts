import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types";

export async function getSessionProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as UserProfile | null };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: (profile as UserProfile | null) ?? null };
}
