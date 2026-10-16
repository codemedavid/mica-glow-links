-- Custom links: buttons the owner adds from the admin Links tab, appended to
-- the category they pick. Optional -- the admin creates this row on its first
-- save -- but seeding it keeps every settings key visible in one place.
-- Read/write rules are inherited from site_settings (public read, owner write).

insert into public.site_settings (key, value)
values ('custom_links', '{"links": []}'::jsonb)
on conflict (key) do nothing;
