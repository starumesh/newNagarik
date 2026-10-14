function cleanUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "");
}

function cleanSupabaseUrl(value: string | undefined): string | undefined {
  const url = cleanUrl(value);
  if (!url) return undefined;
  return url.replace(/\/rest\/v1$/i, "");
}

// NEXT_PUBLIC_ values must be read as static property access so Next.js
// inlines them into the browser bundle. process.env[name] is empty on the client.
const supabaseUrl = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const appUrl = cleanUrl(process.env.NEXT_PUBLIC_APP_URL) ?? "http://localhost:3000";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export const env = {
  supabaseUrl: supabaseUrl ?? "",
  supabaseAnonKey: supabaseAnonKey ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
  upstashUrl: cleanUrl(process.env.UPSTASH_REDIS_REST_URL) ?? "",
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "",
  resendKey: process.env.RESEND_API_KEY?.trim() ?? "",
  adminSecret: process.env.ADMIN_SECRET?.trim() ?? "",
  r2AccountId: process.env.R2_ACCOUNT_ID?.trim() ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "",
  r2BucketName: process.env.R2_BUCKET_NAME?.trim() ?? "newnagarik-listings",
  r2PublicBaseUrl: cleanUrl(process.env.R2_PUBLIC_BASE_URL) ?? "",
  resendFrom:
    process.env.RESEND_FROM?.trim() ??
    "NewNagarik <notifications@newnagarik.com>",
  appUrl,
  apifyToken: process.env.APIFY_API_TOKEN?.trim() ?? "",
  firecrawlKey: process.env.FIRECRAWL_API_KEY?.trim() ?? "",
  cronSecret: process.env.CRON_SECRET?.trim() ?? "",
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "",
  adminPassword: process.env.ADMIN_PASSWORD?.trim() ?? "",
  phoneOtp: process.env.DEV_PHONE_OTP?.trim() || "123456",
  openrouterApiKey:
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    "",
  openrouterBaseUrl:
    process.env.OPENROUTER_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    "https://openrouter.ai/api/v1",
  openrouterModel:
    process.env.OPENROUTER_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "openai/gpt-4o-mini",
};

export const PUBLIC_DEV_PHONE_OTP =
  process.env.NEXT_PUBLIC_DEV_PHONE_OTP?.trim() || "123456";

export function isRedisConfigured(): boolean {
  return Boolean(env.upstashUrl && env.upstashToken);
}

export function isR2Configured(): boolean {
  return Boolean(
    env.r2AccountId &&
      env.r2AccessKeyId &&
      env.r2SecretAccessKey &&
      env.r2BucketName
  );
}
