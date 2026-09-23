-- TỰA – Nét Vẽ Yêu Thương: initial schema (SRS §5, §8)

create extension if not exists pgcrypto;

-- ─── Enums ──────────────────────────────────────────────────────────────────
create type user_role as enum ('ADMIN','STAFF');
create type order_source as enum ('WEB','WORKSHOP');
create type fulfillment_type as enum ('DELIVERY','PICKUP');
create type order_status as enum ('PENDING_PAYMENT','PAYMENT_REVIEW','CONFIRMED','PRINTING','QC','READY','DELIVERED','EXPIRED','CANCELLED');
create type refund_status as enum ('NONE','REQUIRED','DONE');
create type item_type as enum ('PLAIN','CUSTOM');
create type design_source as enum ('CANVAS','SCAN');
create type payment_method as enum ('TRANSFER','CASH');
create type donation_status as enum ('PENDING','CONFIRMED','CANCELLED');

-- ─── Tables ─────────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  role user_role not null default 'STAFF',
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table settings (key text primary key, value jsonb not null);

create sequence order_code_seq;
create sequence donation_code_seq;

create table designs (
  id uuid primary key default gen_random_uuid(),
  source design_source not null,
  canvas_json jsonb,            -- null for SCAN
  preview_url text,             -- mockup preview (low res)
  created_at timestamptz default now()
);

create table design_files (
  id uuid primary key default gen_random_uuid(),
  design_id uuid references designs on delete cascade,
  area text not null,           -- key from settings.print_areas
  file_path text not null,      -- storage path in bucket 'designs' or 'scans'
  width_px int, height_px int
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default 'TUA' || lpad(nextval('order_code_seq')::text, 4, '0'),
  source order_source not null default 'WEB',
  customer_name text not null,
  phone text not null,
  email text,
  fulfillment fulfillment_type not null,
  address text,                 -- DELIVERY
  preferred_time text,          -- DELIVERY or PICKUP (free text)
  pickup_location text,         -- PICKUP (free text)
  note text,
  subtotal int not null check (subtotal >= 0),
  prepay_percent int not null check (prepay_percent in (50,75,100)),
  prepay_amount int not null check (prepay_amount >= 0),
  paid_amount int not null default 0 check (paid_amount >= 0),
  status order_status not null default 'PENDING_PAYMENT',
  refund_status refund_status not null default 'NONE',
  cancel_reason text,
  expires_at timestamptz,
  created_by uuid references profiles,   -- staff for WORKSHOP
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index orders_status_idx on orders (status);
create index orders_phone_idx on orders (phone);
create index orders_expires_idx on orders (expires_at) where status = 'PENDING_PAYMENT';

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders on delete cascade,
  type item_type not null,
  color text not null,
  size text not null,
  quantity int not null check (quantity > 0),
  unit_price int not null check (unit_price >= 0),  -- price locked at order time (BR09)
  design_id uuid references designs,
  check ((type = 'CUSTOM') = (design_id is not null))
);
create index order_items_order_idx on order_items (order_id);

create table order_status_history (
  id bigserial primary key,
  order_id uuid references orders on delete cascade,
  from_status order_status,
  to_status order_status not null,
  note text,
  changed_by uuid references profiles,  -- null = system/customer
  changed_at timestamptz default now()
);
create index order_status_history_order_idx on order_status_history (order_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders on delete cascade,
  amount int not null check (amount > 0),
  method payment_method not null,
  note text,
  recorded_by uuid references profiles,
  recorded_at timestamptz default now()
);
create index payments_order_idx on payments (order_id);

create table donations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default 'UH' || lpad(nextval('donation_code_seq')::text, 4, '0'),
  display_name text not null,
  contact text not null,
  amount int not null check (amount > 0),
  message text,
  is_public boolean not null default true,  -- false = show as anonymous
  is_hidden boolean not null default false, -- admin moderation
  status donation_status not null default 'PENDING',
  confirmed_by uuid references profiles,
  created_at timestamptz default now()
);

create table sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  tier text,
  sort_order int default 0,
  is_active boolean default true
);

create table content_blocks (
  key text primary key,
  title text,
  body text,
  image_url text,
  updated_at timestamptz default now()
);

create table artworks (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  child_name text,
  description text,
  sort_order int default 0
);

create table promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  price_text text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean default true
);

-- ─── updated_at trigger ─────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger orders_set_updated_at before update on orders
  for each row execute function set_updated_at();
create trigger content_blocks_set_updated_at before update on content_blocks
  for each row execute function set_updated_at();

-- ─── Public donor wall view (FR09) ──────────────────────────────────────────
-- Runs with the owner's privileges, so anon can read it without seeing contact info.
create view public_donations as
  select
    id,
    case when is_public then display_name else 'Nhà hảo tâm ẩn danh' end as display_name,
    amount,
    message,
    created_at
  from donations
  where status = 'CONFIRMED' and not is_hidden;

grant select on public_donations to anon, authenticated;

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Every table has RLS on. Anything not granted below is only reachable
-- through server code using the service role.
alter table profiles enable row level security;
alter table settings enable row level security;
alter table designs enable row level security;
alter table design_files enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table payments enable row level security;
alter table donations enable row level security;
alter table sponsors enable row level security;
alter table content_blocks enable row level security;
alter table artworks enable row level security;
alter table promotions enable row level security;

create policy "public read content_blocks" on content_blocks
  for select to anon, authenticated using (true);

create policy "public read artworks" on artworks
  for select to anon, authenticated using (true);

create policy "public read active promotions" on promotions
  for select to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy "public read active sponsors" on sponsors
  for select to anon, authenticated using (is_active);

create policy "staff read own profile" on profiles
  for select to authenticated using (id = auth.uid());

-- ─── Storage buckets ────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('content', 'content', true,  5242880,  array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('designs', 'designs', false, 20971520, array['image/png','application/json']),
  ('scans',   'scans',   false, 10485760, array['image/png','image/jpeg'])
on conflict (id) do nothing;

-- Public bucket 'content' is readable via its public URL; writes go through
-- the service role only. No storage.objects policies are needed for anon.

-- ─── Seed settings (placeholders until SRS §10 items are confirmed) ─────────
insert into settings (key, value) values
  ('prices', '{"PLAIN": 99000, "CUSTOM": 129000}'),
  ('colors', '[{"key":"white","label":"Trắng","hex":"#FFFFFF"},{"key":"black","label":"Đen","hex":"#111111"},{"key":"beige","label":"Be","hex":"#E8DCC4"}]'),
  ('sizes', '["S","M","L","XL","XXL"]'),
  ('print_areas', '[
    {"key":"chest","label":"Ngực trái","side":"front","widthCm":10,"heightCm":10,"xPct":0.58,"yPct":0.22},
    {"key":"front","label":"Mặt trước","side":"front","widthCm":25,"heightCm":30,"xPct":0.5,"yPct":0.45},
    {"key":"back","label":"Mặt sau","side":"back","widthCm":30,"heightCm":40,"xPct":0.5,"yPct":0.45}
  ]'),
  ('export_dpi', '200'),
  ('order_expire_hours', '24'),
  ('bank_sales', '{"bankId":"","accountNo":"","accountName":""}'),
  ('bank_fund',  '{"bankId":"","accountNo":"","accountName":""}'),
  ('donation_min', '300000'),
  ('donation_goal', '10000000')
on conflict (key) do nothing;

insert into content_blocks (key, title, body) values
  ('story', 'Câu chuyện TỰA', ''),
  ('event', 'Campus Workshop', '')
on conflict (key) do nothing;
