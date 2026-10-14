import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, limitByIp } from "@/lib/rate-limit";
import { env, isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

async function ensureAdminUser(email: string, password: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { is_admin: true, role: "admin" },
    user_metadata: { auth_via: "admin_password" },
  });

  if (!error) return;

  if (!/already|registered|exists/i.test(error.message)) {
    throw error;
  }

  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );
  if (!existing) {
    throw new Error("Admin user exists but could not be loaded.");
  }
  const { error: updateError } = await admin.auth.admin.updateUserById(
    existing.id,
    {
      password,
      email_confirm: true,
      app_metadata: { is_admin: true, role: "admin" },
    }
  );
  if (updateError) throw updateError;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }
  if (!env.adminEmail || !env.adminPassword) {
    return NextResponse.json(
      { error: "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local." },
      { status: 500 }
    );
  }

  const limited = await limitByIp(clientIp(request), "admin-login", 8);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const legacyEmails = new Set(["admin@rentsahih.local"]);
  const isAdminEmail = email === env.adminEmail || legacyEmails.has(email);
  if (!isAdminEmail || password !== env.adminPassword) {
    return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
  }

  try {
    await ensureAdminUser(env.adminEmail, password);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not provision admin." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, email: env.adminEmail });
}
