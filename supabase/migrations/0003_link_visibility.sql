-- Link visibility: per-button on/off settings for the public links page.
--
-- The app treats a missing id as visible, so this seed keeps the current page
-- unchanged while giving the admin screen a durable row to update.

insert into public.site_settings (key, value)
values (
  'link_visibility',
  '{
    "visibility": {
      "group-buy": true,
      "book-consultation": true,
      "price-list": true,
      "order-calculator": true,
      "telegram-community": true,
      "customer-reviews": true,
      "peptide-calculator": true,
      "video-tutorials": true,
      "e-guides": true,
      "coa": true,
      "access-doc": true,
      "contact-admin": true,
      "admin-phoebe": true,
      "admin-glia": true,
      "admin-james": true,
      "admin-danica": true,
      "admin-jonina": true
    }
  }'::jsonb
)
on conflict (key) do nothing;
