# Database (Supabase)

OmniFare uses **Supabase** (PostgreSQL) for:
1. **Auth** — User sign-in, profiles
2. **Profiles** — API usage tracking (`api_calls_made`, `max_api_limit`)
3. **Flight cache** — GeoArb merged results by search key

---

## Migration File

**Location:** `supabase/migrations/001_foundation.sql`

Run in Supabase SQL Editor or via `supabase db push`.

---

## Tables

### profiles

Extends Supabase Auth users with usage metadata.

```sql
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text,
  api_calls_made int  not null default 0,
  max_api_limit  int  not null default 1000,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | FK to auth.users |
| `email` | text | User email (optional, from auth) |
| `api_calls_made` | int | Usage counter |
| `max_api_limit` | int | Quota (1000 default) |
| `created_at` | timestamptz | Row creation |
| `updated_at` | timestamptz | Last update |

**Trigger:** `on_auth_user_created` — when a new user signs up, `handle_new_user()` inserts a row into `profiles` with `api_calls_made=0`, `max_api_limit=1000`.

---

### flight_cache

Stores GeoArb merged flight results keyed by search parameters.

```sql
create table public.flight_cache (
  id          uuid primary key default gen_random_uuid(),
  search_key  text not null,
  merged_data jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create unique index idx_flight_cache_search_key on public.flight_cache (search_key);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `search_key` | text | `origin_dest_date_cabinClass_passengers` (lowercase) |
| `merged_data` | jsonb | Full priced flight array |
| `created_at` | timestamptz | Cache write time |

**Index:** Unique on `search_key` — upsert uses this for conflict resolution.

---

## Row Level Security (RLS)

### profiles

```sql
-- Users can view only their own profile
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update only their own profile (for incrementUsage)
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

No insert policy for users — inserts happen via trigger (security definer). No delete — cascade from auth.users handles it.

### flight_cache

```sql
-- Authenticated users can read (shared cache)
create policy "Authenticated users can read flight cache"
  on public.flight_cache for select
  to authenticated
  using (true);

-- Only service role can write
create policy "Service role can manage flight cache"
  on public.flight_cache for all
  to service_role
  using (true)
  with check (true);
```

**Read:** Any authenticated user. Cache is shared across all users.  
**Write:** Service role only. The search route uses `SUPABASE_SERVICE_ROLE_KEY` for cache writes; anon key cannot write.

---

## Cache Usage in Search Route

### Read (Cache Hit)

```typescript
const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data } = await sb
  .from("flight_cache")
  .select("merged_data, created_at")
  .eq("search_key", searchKey)
  .maybeSingle();
```

Uses **anon key**. RLS allows authenticated users to read; in practice the route runs server-side and may use anon for a simple read without user context.

### Write (Cache Miss)

```typescript
const sb = createClient(url, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
await sb.from("flight_cache").upsert(
  { search_key: searchKey, merged_data: pricedFlights, created_at: new Date().toISOString() },
  { onConflict: "search_key" }
);
```

Uses **service role key**. Bypasses RLS. Upsert ensures one row per search_key.

---

## Search Key Format

```
{origin}_{destination}_{date}_{cabinClass}_{passengers}
```

Example: `del_blr_2026-03-17_economy_1`

All lowercase. Uniquely identifies a search for cache lookup.

---

## Profiles Usage Flow

1. **Sign up:** Trigger creates profile with `api_calls_made=0`, `max_api_limit=1000`
2. **Auth load:** Frontend `useAuth` fetches `api_calls_made`, `max_api_limit` for the session user
3. **Booking:** When user clicks "Continue", `incrementUsage()` runs:
   - `UPDATE profiles SET api_calls_made = api_calls_made + 1 WHERE id = user.id`
   - Frontend updates local state

**Unlimited users:** Hardcoded email list in `useAuth` bypasses the check; DB is still updated for consistency.

---

## Triggers

### handle_new_user

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Runs with `security definer` so it can insert into profiles even if the inserting role wouldn't normally have access.

### profiles updated_at

```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
```

Auto-updates `updated_at` on profile update.
