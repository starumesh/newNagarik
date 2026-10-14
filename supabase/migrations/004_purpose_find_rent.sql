-- Allow renter-specific purpose and keep owner/explorer values.
-- Safe to re-run.

alter table public.user_profiles
  drop constraint if exists user_profiles_purpose_check;

alter table public.user_profiles
  add constraint user_profiles_purpose_check
  check (purpose is null or purpose in ('view_trends','list_property','find_rent','connect'));
