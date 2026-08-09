-- Link overrides: editable labels, descriptions, and outbound URLs for the
-- public links page. A missing override means the app uses its bundled default.

insert into public.site_settings (key, value)
values ('link_overrides', '{"overrides": {}}'::jsonb)
on conflict (key) do nothing;
