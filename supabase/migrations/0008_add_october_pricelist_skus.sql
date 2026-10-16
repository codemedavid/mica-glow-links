-- Add: four SKUs on the current Updated Pricelist (GB 10/6) that the table does
-- not have yet -- TSM20, KPV20, VRX-0075, KLOTHO -- and correct the 'NBG60 mm'
-- code to the sheet's 'NBG60'.
--
-- Every other code on the sheet is already in the table at the sheet's
-- per-vial price (0005-0007), so nothing here reprices an existing row. Scoped
-- to these codes, like 0006 and 0007, so no price the owner has edited from
-- the admin page can be reverted by this file.
--
-- Left out on purpose:
--   * NS10 -- the sheet still reads 275, but that is the 5-ampoule pack price;
--     the per-ampoule 55 from 0005 stays (owner confirmed 2026-08-05).
--   * GHKHM (GHK-CU Hydrogel Mask) and RP226 (Relaxation PM Blend) -- the
--     owner already added both from the admin page under other names, so
--     inserting the sheet codes would list each product twice.
--   * The Niimbot printers -- group-buy hardware with no SKU code and no
--     per-vial price, so nothing for the calculator to quote.
--   * Stock on existing rows -- the sheet's on-hand columns are still dated
--     8/25, the same snapshot 0005 read.
--
-- vial_price is the sheet's "Per vial cost" column. Specs come from the
-- packaging line, not the sales copy. stock follows the Mindanao/GLIA on-hand
-- column: ONHAND -> 'in', blank -> 'unknown'.
--
-- Apply with `supabase db push`, or paste into Dashboard -> SQL Editor -> Run.

begin;

insert into public.products (code, name, spec, vial_price, stock, category) values
  ('TSM20', 'Tesamorelin 20mg', '20 mg/vial, 10 vials/kits', 2679.9, 'unknown', 'Peptides'),
  ('KPV20', 'KPV 20mg', '20 mg/vial, 10 vials/kits', 882, 'in', 'Peptides'),
  ('VRX-0075', 'VRX-0075 10mg', '10mg per vial, 10 vials', 1600, 'unknown', 'Peptides'),
  ('KLOTHO', 'KLOTHO 10mg', '10mg per vial, 10 vials', 1726, 'unknown', 'Peptides')
on conflict (code) do update set
  name       = excluded.name,
  spec       = excluded.spec,
  vial_price = excluded.vial_price,
  stock      = excluded.stock,
  updated_at = now();

-- 0005 seeded the gummies as 'NBG60 mm'; the sheet's code is 'NBG60'. Rename
-- in place so the admin's price and stock edits carry over. Guarded so a
-- re-run, or a database where 'NBG60' already exists, is a no-op.
update public.products
set code = 'NBG60', updated_at = now()
where code = 'NBG60 mm'
  and not exists (select 1 from public.products where code = 'NBG60');

commit;


-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- 1. All four rows land, at 2679.9 / 882 / 1600 / 1726
--    (x10 = 26,799 / 8,820 / 16,000 / 17,260 per box):
--
--      select code, name, spec, vial_price, vial_price * 10 as box_price, stock
--      from public.products
--      where code in ('TSM20', 'KPV20', 'VRX-0075', 'KLOTHO')
--      order by code;
--
-- 2. The gummies answer to the new code, and the old one is gone:
--
--      select code, vial_price, stock from public.products
--      where code in ('NBG60', 'NBG60 mm');
--
-- 3. Row count goes up by exactly four (the rename adds nothing):
--
--      select count(*) from public.products;
