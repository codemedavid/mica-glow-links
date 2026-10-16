-- Add: Eloralintide 10mg (ELORA) and Brenipatide 10mg (BRENI), the two
-- 10-vial kits listed under MICABLEND70 on the Updated Pricelist.
--
-- MICABLEND70 (Tirzepatide 60mg + Cagrilintide 10mg) rides along. 0005 already
-- seeds it at the same values, so on a database where 0005 ran this is a no-op
-- apart from updated_at; where it is missing, this puts it in the calculator.
--
-- Scoped to these three codes, like 0006, so no other price the owner has
-- edited from the admin page can be reverted by this file.
--
-- vial_price is the sheet's box price divided by ten, the same rule every
-- 10-vial kit follows (RETALIDE: 26,065/box -> 2606.5):
--   ELORA        9,750/box  -> 975
--   BRENI       14,632/box  -> 1463.2
--   MICABLEND70 27,300/box  -> 2730
--
-- stock is 'unknown' for all three: ELORA is inbound (8 boxes ETA 9/15, 50
-- boxes ETA 9/17), MICABLEND70 is ETA Sept 2026, and BRENI has no stock
-- figure. The table has no ETA column, and 'in' would quote a customer
-- something that has not landed yet. Flip them from the admin page once the
-- boxes arrive.
--
-- Apply with `supabase db push`, or paste into Dashboard -> SQL Editor -> Run.

begin;

insert into public.products (code, name, spec, vial_price, stock, category) values
  ('ELORA', 'Eloralintide 10mg', '10mg, 10 vials', 975, 'unknown', 'Peptides'),
  ('BRENI', 'Brenipatide 10mg (Once per month shot)', '10mg, 10 vials', 1463.2, 'unknown', 'Peptides'),
  ('MICABLEND70', 'Tirzepatide 60mg + Cagrilintide 10mg', '70mg, 10 vials', 2730, 'unknown', 'Peptides')
on conflict (code) do update set
  name       = excluded.name,
  spec       = excluded.spec,
  vial_price = excluded.vial_price,
  stock      = excluded.stock,
  updated_at = now();

commit;


-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- 1. All three rows land, at 975 / 1463.2 / 2730
--    (x10 = 9,750 / 14,632 / 27,300 per box):
--
--      select code, name, spec, vial_price, vial_price * 10 as box_price, stock
--      from public.products
--      where code in ('ELORA', 'BRENI', 'MICABLEND70')
--      order by code;
--
-- 2. Row count goes from 201 to 203, or to 204 if MICABLEND70 was missing
--    (higher only if the owner has added SKUs of their own):
--
--      select count(*) from public.products;
