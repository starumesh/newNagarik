-- Owner rental posts from aggregators (NoBroker, MagicBricks, MyGate),
-- area watches, and admin alerts for newly seen listings.
-- Run in Supabase → SQL Editor if these tables are missing.

create table if not exists public.aggregator_listings (
  id uuid primary key default gen_random_uuid(),
  platform text not null
    check (platform in ('NoBroker', '99acres', 'MyGate', 'MagicBricks', 'Anacity')),
  external_id text not null,
  title text not null,
  building_name text not null default '',
  city text not null,
  area text not null,
  bhk integer,
  monthly_rent integer,
  furnishing text,
  url text,
  rent_per_sqft integer,
  posted_by text not null default 'unknown'
    check (posted_by in ('owner', 'broker', 'unknown')),
  posted_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (platform, external_id)
);

create table if not exists public.area_watches (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  area text not null,
  platforms text[] not null default array['NoBroker', 'MagicBricks', 'MyGate']::text[],
  notify_email text,
  is_enabled boolean not null default true,
  last_scraped_at timestamptz,
  created_at timestamptz not null default now(),
  unique (city, area)
);

create table if not exists public.aggregator_alerts (
  id uuid primary key default gen_random_uuid(),
  watch_id uuid references public.area_watches on delete set null,
  listing_id uuid references public.aggregator_listings on delete set null,
  title text not null,
  city text not null,
  area text not null,
  platform text not null,
  url text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_aggregator_listings_area
  on public.aggregator_listings (city, area, posted_at desc);
create index if not exists idx_aggregator_listings_platform
  on public.aggregator_listings (platform, last_seen_at desc);
create index if not exists idx_aggregator_alerts_unread
  on public.aggregator_alerts (created_at desc)
  where read_at is null;
create index if not exists idx_area_watches_enabled
  on public.area_watches (is_enabled, city, area);

alter table public.aggregator_listings enable row level security;
alter table public.area_watches enable row level security;
alter table public.aggregator_alerts enable row level security;
