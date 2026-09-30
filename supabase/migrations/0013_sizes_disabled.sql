-- Shirt sizes are S, M, L, XL; XL is listed but not on sale online yet.
-- `sizes_disabled` holds sizes shown as disabled buttons and refused at checkout.
-- Admin can change both in Cài đặt → Size.

update settings set value = '["S","M","L","XL"]'::jsonb where key = 'sizes';

insert into settings (key, value) values ('sizes_disabled', '["XL"]'::jsonb)
on conflict (key) do update set value = excluded.value;
