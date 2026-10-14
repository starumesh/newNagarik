-- Admin moderation: hide/edit metadata, photos, tags, scores,
-- and a catalog of cities / areas that can be enabled or disabled.
-- Run in Supabase → SQL Editor if these columns/tables are missing.

alter table public.rent_entries
  add column if not exists is_hidden boolean not null default false,
  add column if not exists tags text[] not null default '{}',
  add column if not exists photos text[] not null default '{}',
  add column if not exists admin_score integer;

alter table public.rent_entries
  drop constraint if exists rent_entries_admin_score_check;
alter table public.rent_entries
  add constraint rent_entries_admin_score_check
  check (admin_score is null or (admin_score >= 1 and admin_score <= 10));

alter table public.locations
  add column if not exists kind text not null default 'building',
  add column if not exists is_enabled boolean not null default true;

alter table public.locations
  drop constraint if exists locations_kind_check;
alter table public.locations
  add constraint locations_kind_check
  check (kind in ('building', 'society', 'community'));

create table if not exists public.catalog_cities (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_enabled boolean not null default true,
  created_at timestamp default now()
);

create table if not exists public.catalog_areas (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  name text not null,
  kind text not null default 'area'
    check (kind in ('area', 'society', 'community')),
  is_enabled boolean not null default true,
  created_at timestamp default now(),
  unique (city, name, kind)
);

create index if not exists idx_rent_entries_hidden on public.rent_entries(is_hidden);
create index if not exists idx_catalog_areas_city on public.catalog_areas(city);
create index if not exists idx_locations_enabled on public.locations(is_enabled);

alter table public.catalog_cities enable row level security;
alter table public.catalog_areas enable row level security;

drop policy if exists "Public read enabled cities" on public.catalog_cities;
create policy "Public read enabled cities"
on public.catalog_cities for select
using (is_enabled = true);

drop policy if exists "Public read enabled areas" on public.catalog_areas;
create policy "Public read enabled areas"
on public.catalog_areas for select
using (is_enabled = true);
