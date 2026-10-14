# NewNagarik

Neighborhood rent clarity for Indian cities. Contributors unlock building-level rent. Explorers only see city macro trends.

## What you get in this MVP

- Next.js 14 App Router, Tailwind, shadcn/ui (teal + navy trust theme)
- Supabase Auth (email OTP), PostgreSQL, RLS, Realtime inbox
- Vertical onboarding: Location → Owner / Renter / Explorer → Purpose
- 4-pillar verification engine on `/api/submit-rent` and onboarding
- Search with BHK / furnishing / budget filters and aggregator fallback
- Anonymous inquiry relay + Resend email (never includes renter PII)
- Admin review at `/admin/verification` gated by email/password (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- Cloudflare R2 photo uploads for owner listings
- Upstash Redis cache (24h) and IP hashing for rate limits (raw IPs are never stored)

## Privacy rules that are actually enforced

- Public tables do **not** store email or phone. Those live in `auth.users` only.
- Identity fingerprinting hashes email/phone with SHA-256 into `identity_hashes` / `banned_identities`.
- RLS on `identity_hashes`, `banned_identities`, and `verification_logs` is enabled with **no client policies**. Only the service role can read them. The original spec’s `using (true)` would have leaked hashes — that is intentionally not used.
- `rent_entries` SELECT requires `trust_score >= 80`, `role <> 'explorer'`, and no active restriction.

## Stack

| Layer | Service | Free-tier note |
|---|---|---|
| App | Vercel | Mumbai (`bom1`) in `vercel.json` |
| DB + Auth + Realtime | Supabase | Indexed queries, `.limit(15)` everywhere |
| Cache / rate limit | Upstash Redis | 24h aggregator cache |
| Email | Resend | Inquiry notifications |
| Photos | Cloudflare R2 | Owner listing images |
| Scrapers | Apify / Firecrawl | Pay-per-use, only when Pillar 4 needs it |

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 1. Supabase

1. Create a project.
2. Paste `supabase/schema.sql` into the SQL editor and run it.
3. Authentication → Providers → Email: enable OTP / magic link.
4. Copy Project URL, anon key, and service role key into `.env.local`.

### 2. Upstash, Resend, R2 (optional but recommended)

- Upstash: REST URL + token. Without it, caching and rate limits no-op.
- Resend: API key. Without it, inquiries still save in-app.
- R2: S3-compatible keys + public bucket URL. Without it, listings work without photos.

### 3. Admin panel

Sign in at `/admin/login` with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env.local` (defaults: `admin@newnagarik.local` / `AdminSahih1`). This is separate from renter/owner phone login. Approve publishes the entry and boosts trust. Reject sets `trust_score = 0`, `role = explorer`, bans identity hashes for 6 months.

### 4. External listings

Set `APIFY_API_TOKEN` + `APIFY_RENT_ACTOR_ID` and/or `FIRECRAWL_API_KEY`. Results are cached 24 hours. Vague landmark-only ads are dropped in `lib/scrapers/filter.ts`.

For local UI only you may set `DEMO_EXTERNAL_LISTINGS=true`. Do **not** enable this in production.

## Access model

| Persona | Search | Building averages | Inbox |
|---|---|---|---|
| Explorer | Disabled | No | Own threads only |
| Renter, auto-approved | Full | Avg / median / min / max | Inquiry relay |
| Renter, under review | Macro only | No | After approval |
| Penalized (`trust_score < 80`) | Disabled | No | Locked to explorer |
| Owner (listed) | Full | Yes | Receives live red-dot + email |

## Verification sequence

1. **Identity** — banned hash → `Submission blocked.` Burst of >3 buildings / 24h → `under_review`.
2. **Structure** — `rent / carpet_area` vs locality baseline with furnishing / lift / parking / backup multipliers. `> 2×` expected → review.
3. **Internal DB** — building average if ≥3 verified entries, else locality. `>±40%` → review.
4. **External** — runs only if Pillar 3 deviation `>30%` or building has `<5` entries. `>50%` above scraped PSF → review.

All pass → `auto_approved` and immediately public.

## Deploy

```bash
npx vercel
```

Set the same environment variables in the Vercel project. First production build does not require live keys for compilation; auth routes stay dynamic.

## Project map

```
app/api/submit-rent     4-pillar renter submissions
app/api/search          trust-gated search + fallback
app/api/messages        relay + Resend
app/admin/verification  split-screen moderation
lib/verification        engine
lib/scrapers            cache, filter, Apify/Firecrawl adapters
supabase/schema.sql     tables, indexes, RLS, seed snapshots
```
