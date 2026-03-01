-- ============================================================
-- OmniFare Phase 1 — Foundation Schema
-- Run this in the Supabase SQL Editor (or via supabase db push)
-- ============================================================

-- 1. profiles — extends Supabase Auth users
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  api_calls_made  int  not null default 0,
  max_api_limit   int  not null default 1000,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'User profiles extending Supabase Auth. Tracks per-user API usage.';

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. flight_cache — stores GeoArb merged results
create table if not exists public.flight_cache (
  id          uuid primary key default gen_random_uuid(),
  search_key  text not null,
  merged_data jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.flight_cache is
  'Caches GeoArb merged flight+POS results. search_key = origin_dest_date_class_pax.';

create unique index if not exists idx_flight_cache_search_key
  on public.flight_cache (search_key);

-- 3. Row Level Security ------------------------------------------------

alter table public.profiles  enable row level security;
alter table public.flight_cache enable row level security;

-- profiles: users can read/update only their own row
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- flight_cache: any authenticated user can read (shared cache)
create policy "Authenticated users can read flight cache"
  on public.flight_cache for select
  to authenticated
  using (true);

-- only the service role (backend) can insert/update cache rows
create policy "Service role can manage flight cache"
  on public.flight_cache for all
  to service_role
  using (true)
  with check (true);

-- 4. Helper: updated_at trigger for profiles
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
