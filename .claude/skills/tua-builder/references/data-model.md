# Data model (Supabase Postgres)

Write it as `supabase/migrations/0001_init.sql`. Adjust as needed but keep the names.

```sql
create type user_role as enum ('ADMIN','STAFF');
create type order_source as enum ('WEB','WORKSHOP');
create type fulfillment_type as enum ('DELIVERY','PICKUP');
create type order_status as enum ('PENDING_PAYMENT','PAYMENT_REVIEW','CONFIRMED','PRINTING','QC','READY','DELIVERED','EXPIRED','CANCELLED');
create type refund_status as enum ('NONE','REQUIRED','DONE');
create type item_type as enum ('PLAIN','CUSTOM');
create type design_source as enum ('CANVAS','SCAN');
create type payment_method as enum ('TRANSFER','CASH');
create type donation_status as enum ('PENDING','CONFIRMED','CANCELLED');

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
  preview_url text,             -- mockup preview (public-ish, low res)
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
  subtotal int not null,
  prepay_percent int not null check (prepay_percent in (50,75,100)),
  prepay_amount int not null,
  paid_amount int not null default 0,
  status order_status not null default 'PENDING_PAYMENT',
  refund_status refund_status not null default 'NONE',
  cancel_reason text,
  expires_at timestamptz,
  created_by uuid references profiles,   -- staff for WORKSHOP
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders on delete cascade,
  type item_type not null,
  color text not null,
  size text not null,
  quantity int not null check (quantity > 0),
  unit_price int not null,       -- price locked at order time (BR09)
  design_id uuid references designs,
  check ((type = 'CUSTOM') = (design_id is not null))
);

create table order_status_history (
  id bigserial primary key,
  order_id uuid references orders on delete cascade,
  from_status order_status, to_status order_status not null,
  note text, changed_by uuid references profiles,  -- null = system/customer
  changed_at timestamptz default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders on delete cascade,
  amount int not null, method payment_method not null, note text,
  recorded_by uuid references profiles, recorded_at timestamptz default now()
);

create table donations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default 'UH' || lpad(nextval('donation_code_seq')::text, 4, '0'),
  display_name text not null, contact text not null,
  amount int not null, message text,
  is_public boolean not null default true,  -- false = show as anonymous
  is_hidden boolean not null default false, -- admin moderation
  status donation_status not null default 'PENDING',
  confirmed_by uuid references profiles, created_at timestamptz default now()
);

create table sponsors (id uuid primary key default gen_random_uuid(), name text not null,
  logo_url text, website_url text, tier text, sort_order int default 0, is_active boolean default true);
create table content_blocks (key text primary key, title text, body text, image_url text, updated_at timestamptz default now());
create table artworks (id uuid primary key default gen_random_uuid(), image_url text not null,
  child_name text, description text, sort_order int default 0);
create table promotions (id uuid primary key default gen_random_uuid(), title text not null,
  description text, image_url text, price_text text, starts_at timestamptz, ends_at timestamptz,
  is_active boolean default true);
```

## Seed settings
```json
{
  "prices": { "PLAIN": 99000, "CUSTOM": 129000 },
  "colors": [{"key":"white","label":"Trắng","hex":"#FFFFFF"},{"key":"black","label":"Đen","hex":"#111111"},{"key":"beige","label":"Be","hex":"#E8DCC4"}],
  "sizes": ["S","M","L","XL","XXL"],
  "print_areas": [
    {"key":"chest","label":"Ngực trái","side":"front","widthCm":10,"heightCm":10,"xPct":0.58,"yPct":0.22},
    {"key":"front","label":"Mặt trước","side":"front","widthCm":25,"heightCm":30,"xPct":0.5,"yPct":0.45},
    {"key":"back","label":"Mặt sau","side":"back","widthCm":30,"heightCm":40,"xPct":0.5,"yPct":0.45}
  ],
  "export_dpi": 200,
  "order_expire_hours": 24,
  "bank_sales": {"bankId":"<BIN or code>","accountNo":"","accountName":""},
  "bank_fund":  {"bankId":"","accountNo":"","accountName":""},
  "donation_min": 300000,
  "donation_goal": 10000000
}
```
The `print_areas` values are placeholders until the design team gives the real sizes. xPct/yPct is the area center on the mockup image.

## Storage buckets
- `content` (public): artworks, sponsor logos, promotion images, story images.
- `designs` (private): canvas exports. Written only by the server with the service role.
- `scans` (private): workshop scans. Written only by staff through the server.
Admin views private files through signed URLs (1 hour).

## RLS
Enable RLS on every table. Public (anon) may only SELECT from `content_blocks`, `artworks`, active `promotions`, active `sponsors`, and a view `public_donations` (confirmed, not hidden; exposes display_name or 'Nhà hảo tâm ẩn danh', amount, message, created_at). All writes and all order reads go through server actions using the service role, after `requireRole()` or code+phone checks.

## State machine (`lib/orders/state-machine.ts`)
```ts
export const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAYMENT_REVIEW','EXPIRED','CANCELLED'],
  PAYMENT_REVIEW:  ['CONFIRMED','PENDING_PAYMENT','CANCELLED'],
  CONFIRMED:       ['PRINTING','CANCELLED'],
  PRINTING:        ['QC'],
  QC:              ['READY','PRINTING'],
  READY:           ['DELIVERED'],
  DELIVERED: [], EXPIRED: [], CANCELLED: [],
};
export const STATUS_LABEL = { PENDING_PAYMENT:'Chờ thanh toán', PAYMENT_REVIEW:'Chờ xác nhận thanh toán',
  CONFIRMED:'Đã xác nhận', PRINTING:'Đang in', QC:'Kiểm tra chất lượng', READY:'Sẵn sàng giao/nhận',
  DELIVERED:'Đã giao', EXPIRED:'Hết hạn', CANCELLED:'Đã hủy' };
```
Guards: CONFIRMED requires `paid_amount >= ceil(subtotal*0.5)` (BR02). Cancelling with `paid_amount > 0` sets `refund_status = 'REQUIRED'`.
