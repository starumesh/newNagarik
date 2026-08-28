function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    optional("NEXT_PUBLIC_SUPABASE_URL") &&
      optional("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

export const env = {
  supabaseUrl: optional("NEXT_PUBLIC_SUPABASE_URL") ?? "",
  supabaseAnonKey: optional("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? "",
  supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  upstashUrl: optional("UPSTASH_REDIS_REST_URL") ?? "",
  upstashToken: optional("UPSTASH_REDIS_REST_TOKEN") ?? "",
  resendKey: optional("RESEND_API_KEY") ?? "",
  adminSecret: optional("ADMIN_SECRET") ?? "",
  r2AccountId: optional("R2_ACCOUNT_ID") ?? "",
  r2AccessKeyId: optional("R2_ACCESS_KEY_ID") ?? "",
  r2SecretAccessKey: optional("R2_SECRET_ACCESS_KEY") ?? "",
  r2BucketName: optional("R2_BUCKET_NAME") ?? "rentsahih-listings",
  r2PublicBaseUrl: optional("R2_PUBLIC_BASE_URL") ?? "",
  resendFrom: optional("RESEND_FROM") ?? "RentSahih <notifications@rentsahih.com>",
  appUrl: optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  apifyToken: optional("APIFY_API_TOKEN") ?? "",
  firecrawlKey: optional("FIRECRAWL_API_KEY") ?? "",
};

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
