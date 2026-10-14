-- Extended onboarding fields for NewNagarik
-- Run in Supabase SQL Editor after the base schema.

alter table public.property_listings
  add column if not exists carpet_area integer,
  add column if not exists maintenance_status text check (maintenance_status in ('included','extra','none')) default 'extra',
  add column if not exists maintenance_amount integer,
  add column if not exists pet_friendly text check (pet_friendly in ('yes','no','case_by_case')) default 'case_by_case',
  add column if not exists pet_case_notes text default '',
  add column if not exists building_age_years integer,
  add column if not exists floor_number integer,
  add column if not exists facilities text[] default '{}';

alter table public.rent_entries
  add column if not exists local_insights jsonb default '{}'::jsonb;

alter table public.user_profiles
  add column if not exists explorer_notes jsonb default '{}'::jsonb;
