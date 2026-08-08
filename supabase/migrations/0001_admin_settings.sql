-- Admin foundation: editable shop settings + write authorisation.
--
-- Apply with the Supabase CLI (`supabase db push`) or by pasting into
-- Dashboard -> SQL Editor -> New query -> Run.
--
-- SECURITY MODEL, in one paragraph:
-- The publishable key ships inside the public JavaScript bundle, so it grants
-- no privilege of its own. Everything below assumes an attacker already has it.
-- Row-level security is therefore the only real boundary: anonymous visitors
-- may read, and exactly one signed-in email may write. No password appears in
-- this file or anywhere in the repository -- it lives, hashed, in Supabase Auth.
--
-- AFTER RUNNING THIS, two manual dashboard steps are REQUIRED:
--   1. Authentication -> Users -> Add user: joninadavid3@gmail.com, with a long
--      random passphrase from a password manager.
--   2. Authentication -> Providers -> Email: turn OFF "Enable sign-ups".
--      Without this, anyone can register an account. The policies below pin
--      writes to one specific email rather than to the `authenticated` role,
--      which blunts that risk -- but leaving public signup on is still an open
--      door you do not need.

begin;

-- The one account allowed to write. Kept in a function so the address appears
-- once; changing owner later is a single CREATE OR REPLACE, not a policy sweep.
create or replace function public.is_shop_owner()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'joninadavid3@gmail.com';
$$;


-- ---------------------------------------------------------------------------
-- site_settings: key/value shop configuration
-- ---------------------------------------------------------------------------
-- Key/value rather than one column per setting, so adding the announcement
-- banner and published-at stamp later needs no further migration.

create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb       not null,
  updated_at timestamptz not null default now()
);

-- Seed the current fee. ON CONFLICT DO NOTHING so re-running never clobbers a
-- fee the owner has since changed.
insert into public.site_settings (key, value)
values ('shipping_fee', '{"amount": 250}'::jsonb)
on conflict (key) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists site_settings_owner_write on public.site_settings;
create policy site_settings_owner_write
  on public.site_settings
  for all
  to authenticated
  using (public.is_shop_owner())
  with check (public.is_shop_owner());


-- ---------------------------------------------------------------------------
-- products: the catalogue the order calculator reads
-- ---------------------------------------------------------------------------
-- Created here so this migration works on an empty project. On a project that
-- already has the table, CREATE IF NOT EXISTS is a no-op and the ALTERs below
-- add only what is missing.
--
-- Column names are fixed by src/data/productsRepository.js, which selects
-- exactly "code, name, spec, vial_price, stock". stock is constrained to the
-- four states the app understands; anything else is dropped on read, so the
-- constraint turns a silent disappearance into a loud write failure.

create table if not exists public.products (
  code       text primary key,
  name       text        not null,
  spec       text,
  vial_price numeric     not null check (vial_price > 0),
  stock      text        not null default 'unknown'
               check (stock in ('in', 'low', 'out', 'unknown')),
  category   text,
  sort_order integer,
  updated_at timestamptz not null default now()
);

-- Additive and nullable, for projects where the table predates these columns.
alter table public.products add column if not exists category   text;
alter table public.products add column if not exists sort_order integer;
alter table public.products add column if not exists updated_at timestamptz not null default now();

-- Backfill categories from the SKU prefixes already in use. Only fills nulls,
-- so hand-corrections made later survive a re-run.
update public.products
set category = case
  when code like 'BA%' or code like 'WA%' then 'Supplies'
  else 'Peptides'
end
where category is null;

alter table public.products enable row level security;

drop policy if exists products_public_read on public.products;
create policy products_public_read
  on public.products
  for select
  to anon, authenticated
  using (true);

drop policy if exists products_owner_write on public.products;
create policy products_owner_write
  on public.products
  for all
  to authenticated
  using (public.is_shop_owner())
  with check (public.is_shop_owner());

commit;


-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- 1. Both tables should report relrowsecurity = true:
--
--      select relname, relrowsecurity
--      from pg_class
--      where relname in ('products', 'site_settings');
--
-- 2. From a signed-OUT browser console on the live site, this must fail with
--    "new row violates row-level security policy". If it succeeds, stop and
--    re-check the policies -- the price list is world-writable:
--
--      await supabase.from('site_settings')
--        .upsert({ key: 'shipping_fee', value: { amount: 1 } })
--
-- 3. Reads must still work signed out, or the order calculator goes stale:
--
--      await supabase.from('products').select('code, vial_price').limit(1)
