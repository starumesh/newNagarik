-- RentSahih production schema
-- Privacy note: identity_hashes / banned_identities / verification_logs have RLS
-- enabled with NO client policies. The service role (server only) bypasses RLS.
-- Do not use `using (true)` on those tables — it would leak identity hashes.

create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  id uuid references auth.users not null primary key,
  role text check (role in ('owner','renter','explorer')) default 'explorer',
  trust_score integer default 50,
  restricted_until timestamp,
  onboarding_completed boolean default false,
  purpose text check (purpose in ('view_trends','list_property','connect')),
  home_city text,
  created_at timestamp default now()
);

create table if not exists public.identity_hashes (
  id uuid primary key default gen_random_uuid(),
  email_hash text unique not null,
  phone_hash text unique,
  is_banned boolean default false
);

create table if not exists public.banned_identities (
  id uuid primary key default gen_random_uuid(),
  identity_hash text unique not null,
  hash_type text check (hash_type in ('email','phone')),
  reason text,
  banned_at timestamp default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  area text not null,
  building_name text not null,
  unique (city, area, building_name)
);

create table if not exists public.rent_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles not null,
  location_id uuid references public.locations not null,
  bhk integer check (bhk >= 1 and bhk <= 10),
  monthly_rent integer not null,
  maintenance integer default 0,
  carpet_area integer not null,
  floor_level text check (floor_level in ('ground','low','mid','high')),
  furnishing text check (furnishing in ('unfurnished','semi','fully')),
  total_units text check (total_units in ('<10','11-30','31-100','100+')),
  has_lift boolean default false,
  has_parking boolean default false,
  parking text check (parking in ('yes','no','paid')) default 'no',
  power_backup text check (power_backup in ('yes','no','partial')),
  metro_distance integer,
  internal_locality_avg integer,
  scraped_external_avg integer,
  verification_status text check (verification_status in ('auto_approved','under_review','rejected')) default 'under_review',
  submitted_at timestamp default now()
);

create table if not exists public.property_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.user_profiles not null,
  location_id uuid references public.locations not null,
  asking_rent integer not null,
  bhk integer default 2,
  furnishing text check (furnishing in ('unfurnished','semi','fully')) default 'unfurnished',
  photos text[] default '{}',
  is_active boolean default true,
  created_at timestamp default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.property_listings,
  external_ref text,
  building_name text,
  sender_id uuid references public.user_profiles,
  receiver_id uuid references public.user_profiles,
  content text not null,
  read_at timestamp,
  created_at timestamp default now()
);

create table if not exists public.verification_logs (
  id uuid primary key default gen_random_uuid(),
  rent_entry_id uuid references public.rent_entries,
  pillar_1_passed boolean,
  pillar_2_passed boolean,
  pillar_3_passed boolean,
  pillar_4_passed boolean,
  details jsonb,
  created_at timestamp default now()
);

create table if not exists public.scraped_benchmarks (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations,
  avg_psf integer,
  source text,
  created_at timestamp default now()
);

create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  locality text not null,
  avg_rent integer not null,
  yoy_change numeric not null,
  demand_index integer not null,
  period text default '2026-Q3',
  unique (city, locality, period)
);

create index if not exists idx_rent_entries_location on public.rent_entries(location_id, bhk);
create index if not exists idx_rent_entries_status on public.rent_entries(verification_status);
create index if not exists idx_locations_building on public.locations(building_name);
create index if not exists idx_messages_receiver on public.messages(receiver_id, read_at);
create index if not exists idx_market_city on public.market_snapshots(city);

alter table public.user_profiles enable row level security;
alter table public.identity_hashes enable row level security;
alter table public.banned_identities enable row level security;
alter table public.locations enable row level security;
alter table public.rent_entries enable row level security;
alter table public.property_listings enable row level security;
alter table public.messages enable row level security;
alter table public.verification_logs enable row level security;
alter table public.scraped_benchmarks enable row level security;
alter table public.market_snapshots enable row level security;

drop policy if exists "Users read own profile" on public.user_profiles;
create policy "Users read own profile"
on public.user_profiles for select
using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.user_profiles;
create policy "Users update own profile"
on public.user_profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Public read locations" on public.locations;
create policy "Public read locations"
on public.locations for select
using (true);

drop policy if exists "Authenticated insert locations" on public.locations;
create policy "Authenticated insert locations"
on public.locations for insert
to authenticated
with check (true);

drop policy if exists "Any authenticated user can insert rent entry" on public.rent_entries;
create policy "Any authenticated user can insert rent entry"
on public.rent_entries for insert
with check (auth.uid() = user_id);

drop policy if exists "Trusted users can read rent entries" on public.rent_entries;
create policy "Trusted users can read rent entries"
on public.rent_entries for select
using (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid()
      and up.trust_score >= 80
      and up.role <> 'explorer'
      and (up.restricted_until is null or up.restricted_until < now())
  )
);

drop policy if exists "Owners insert own listings" on public.property_listings;
create policy "Owners insert own listings"
on public.property_listings for insert
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'owner'
  )
);

drop policy if exists "Owners update own listings" on public.property_listings;
create policy "Owners update own listings"
on public.property_listings for update
using (auth.uid() = owner_id);

drop policy if exists "Verified users read listings" on public.property_listings;
create policy "Verified users read listings"
on public.property_listings for select
using (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid()
      and up.trust_score >= 80
      and up.role <> 'explorer'
  )
);

drop policy if exists "Users read their messages" on public.messages;
create policy "Users read their messages"
on public.messages for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users insert messages" on public.messages;
create policy "Users insert messages"
on public.messages for insert
with check (auth.uid() = sender_id);

drop policy if exists "Users update own received messages" on public.messages;
create policy "Users update own received messages"
on public.messages for update
using (auth.uid() = receiver_id);

drop policy if exists "Public read market snapshots" on public.market_snapshots;
create policy "Public read market snapshots"
on public.market_snapshots for select
using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, role, trust_score, onboarding_completed)
  values (new.id, 'explorer', 50, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.market_snapshots (city, locality, avg_rent, yoy_change, demand_index)
values
  ('Bengaluru','Koramangala',42000,8.4,86),
  ('Bengaluru','Whitefield',32000,11.2,91),
  ('Bengaluru','HSR Layout',38000,7.1,80),
  ('Bengaluru','Indiranagar',48000,6.2,77),
  ('Bengaluru','Electronic City',22000,4.8,61),
  ('Mumbai','Andheri',55000,5.4,84),
  ('Mumbai','Bandra',95000,3.9,72),
  ('Mumbai','Powai',62000,6.8,79),
  ('Mumbai','Thane',32000,9.1,88),
  ('Delhi NCR','Gurugram',45000,7.6,83),
  ('Delhi NCR','Noida',28000,10.4,87),
  ('Delhi NCR','Saket',52000,4.2,68),
  ('Hyderabad','Gachibowli',35000,12.1,93),
  ('Hyderabad','Hitech City',38000,11.4,90),
  ('Pune','Hinjewadi',24000,9.8,89),
  ('Pune','Baner',30000,8.2,81),
  ('Chennai','OMR',26000,7.9,82),
  ('Chennai','Adyar',40000,5.1,70)
on conflict (city, locality, period) do nothing;

insert into public.locations (city, area, building_name)
values
  ('Bengaluru','Whitefield','Prestige Lakeside Habitat'),
  ('Bengaluru','Whitefield','Sobha Dream Acres'),
  ('Bengaluru','Koramangala','Prestige Acropolis'),
  ('Bengaluru','HSR Layout','Salarpuria Sattva Magnificia'),
  ('Mumbai','Powai','Hiranandani Gardens'),
  ('Mumbai','Andheri','Kalpataru Sparkle'),
  ('Hyderabad','Gachibowli','My Home Bhooja'),
  ('Pune','Hinjewadi','Rohan Kritika'),
  ('Delhi NCR','Gurugram','DLF The Crest'),
  ('Chennai','Adyar','TVH Quadrant')
on conflict (city, area, building_name) do nothing;

alter table public.messages replica identity full;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.messages';
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
