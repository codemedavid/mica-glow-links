-- Second admin account: joninadavid2@gmail.com may edit the shop alongside the
-- original owner. Every owner-write policy (site_settings, products) goes
-- through is_shop_owner(), so this one function is the whole change.
--
-- To revoke later, remove the address from the list and re-run.

create or replace function public.is_shop_owner()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'joninadavid3@gmail.com',
    'joninadavid2@gmail.com'
  );
$$;
