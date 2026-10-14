-- Complaints / lived-in notes for rental reviews
-- Run in Supabase → SQL Editor if local_insights is missing.

alter table public.rent_entries
  add column if not exists local_insights jsonb default '{}'::jsonb;

alter table public.user_profiles
  add column if not exists explorer_notes jsonb default '{}'::jsonb;

alter table public.property_listings
  add column if not exists facilities text[] default '{}';
