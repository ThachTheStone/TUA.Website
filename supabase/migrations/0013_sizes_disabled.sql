-- Shirt sizes are S, M, L, XL. `sizes_disabled` holds sizes shown as disabled buttons and refused at
-- checkout; it starts empty (XL is on sale since 01/10/2026). Admin can change both in Cài đặt → Size.

update settings set value = '["S","M","L","XL"]'::jsonb where key = 'sizes';

insert into settings (key, value) values ('sizes_disabled', '[]'::jsonb)
on conflict (key) do nothing;
