import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const meta = user.app_metadata ?? {};
  return meta.is_admin === true || meta.role === "admin";
}

export async function getAdminSession() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminUser(user)) return { user: null, ok: false as const };
  return { user, ok: true as const };
}
