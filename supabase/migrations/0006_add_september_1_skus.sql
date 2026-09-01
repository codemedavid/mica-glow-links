-- Add: five skincare SKUs that arrived after the August 25 price list.
-- Source of truth: price list rows 182-186, codes SG11 through SG15.
--
-- Scoped deliberately narrow. 0005 restated the whole catalogue because the
-- spreadsheet was newer than the table; this one is an addition, so it names
-- only the five new codes and cannot revert a price the owner has edited from
-- the admin page since.
--
-- ON CONFLICT DO UPDATE rather than DO NOTHING: nothing here exists yet, so
-- the conflict branch only ever fires on a re-run, and on a re-run the intent
-- is to correct a mistyped row, not to silently skip it.
--
-- spec comes from the packaging column, not the sales copy, with the sheet's
-- "Contains" / "Set Contains" lead-in dropped -- that is chrome for a human
-- reading a spreadsheet, not part of what is in the box.
--
-- stock is 'unknown' for all five: the sheet's stock columns are blank for
-- these rows, and 'in' would quote a customer something that may not be there.
--
-- category is 'Peptides', matching SG01-SG10. The grouping is coarser than the
-- products are, but a new SKU should not be the thing that splits it.
--
-- Apply with `supabase db push`, or paste into Dashboard -> SQL Editor -> Run.

begin;

insert into public.products (code, name, spec, vial_price, stock, category) values
  ('SG11', 'PDRN Peptide Eye Patches', '30 pairs / 85 grams', 499, 'unknown', 'Peptides'),
  ('SG12', 'Dark Spot Brightening Cream', '35 mL Tube', 499, 'unknown', 'Peptides'),
  ('SG13', 'Rejuvenating Solution Serum', '10ml x 5 vials', 699, 'unknown', 'Peptides'),
  ('SG14', 'Microbiome Radiance Ampoule', '7ml x 5 Ampoules', 649, 'unknown', 'Peptides'),
  ('SG15', 'Kojic Acid Brightening Cream', '50.7grams tube', 499, 'unknown', 'Peptides')
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
-- 1. All five rows land, at 499 / 499 / 699 / 649 / 499:
--
--      select code, name, spec, vial_price, stock
--      from public.products
--      where code in ('SG11', 'SG12', 'SG13', 'SG14', 'SG15')
--      order by code;
--
-- 2. Row count goes from 196 to 201 (higher only if the owner has added SKUs
--    of their own):
--
--      select count(*) from public.products;
--
-- 3. Nothing else was touched -- no other row's updated_at moved:
--
--      select code, updated_at from public.products
--      order by updated_at desc limit 10;
