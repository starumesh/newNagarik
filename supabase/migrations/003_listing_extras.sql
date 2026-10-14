-- Carpet area, maintenance amount, and pet case notes
-- Safe to run even if 002 was already applied.

alter table public.property_listings
  add column if not exists carpet_area integer;

alter table public.property_listings
  add column if not exists maintenance_amount integer;

alter table public.property_listings
  add column if not exists pet_case_notes text default '';
