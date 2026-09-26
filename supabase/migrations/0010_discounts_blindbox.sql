-- FR31 (promo codes + combos), FR32 (Hot Wheels blindbox), new prices and colours (BR09, SRS §10 #4).
--
-- New enum values cannot be used as literals in the same transaction that adds them,
-- so 'BLINDBOX' only appears inside function bodies below.

alter type item_type add value if not exists 'BLINDBOX';

-- ─── Prices and colours ─────────────────────────────────────────────────────
-- Black only. Orders that already have white/beige shirts keep their colour key; the
-- site still shows "Trắng"/"Be" for them (lib/format.ts colorLabel).
update settings set value = '{"PLAIN": 79000, "CUSTOM": 159000, "BLINDBOX": 69000}'::jsonb where key = 'prices';
update settings set value = '[{"key":"black","label":"Đen","hex":"#111111"}]'::jsonb where key = 'colors';

-- The blindbox (one product). `stock` is the total number of boxes the organizers have;
-- what is left = stock − boxes in orders that are not cancelled or expired.
insert into settings (key, value) values
  ('blindbox', '{"name":"Blindbox Hot Wheels","description":"","image_url":null,"stock":0,"is_active":false}'::jsonb)
on conflict (key) do nothing;

-- ─── Promo codes ─────────────────────────────────────────────────────────────
create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code ~ '^[A-Z0-9_-]{3,30}$'),
  description text,
  kind text not null check (kind in ('PERCENT', 'AMOUNT')),
  value int not null check (value > 0),
  max_discount int check (max_discount is null or max_discount > 0),  -- cap for PERCENT
  min_subtotal int not null default 0 check (min_subtotal >= 0),
  max_uses int check (max_uses is null or max_uses > 0),              -- null = unlimited
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'PERCENT' or value <= 100)
);
alter table promo_codes enable row level security;  -- server (service role) only

-- ─── Combos ──────────────────────────────────────────────────────────────────
-- items: [{"type": "CUSTOM" | "PLAIN" | "PROTOTYPE" | "BLINDBOX", "quantity": 1}]
create table combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price int not null check (price > 0),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table combos enable row level security;

-- ─── Orders: amount before discount + what was applied ─────────────────────
-- `subtotal` stays the amount the buyer owes (after discount), so payments and "Còn nợ"
-- keep working unchanged.
alter table orders
  add column items_total int,
  add column discount_amount int not null default 0 check (discount_amount >= 0),
  add column discount_note text,
  add column promo_code_id uuid references promo_codes on delete restrict;
update orders set items_total = subtotal where items_total is null;
alter table orders alter column items_total set not null;
create index orders_promo_code_idx on orders (promo_code_id) where promo_code_id is not null;

-- ─── create_order: discount fields, promo usage limit, blindbox stock ──────
create or replace function create_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_order orders;
  v_item jsonb;
  v_design jsonb;
  v_design_id uuid;
  v_file jsonb;
  v_type item_type;
  v_promo uuid := (p_order->>'promo_code_id')::uuid;
  v_max_uses int;
  v_used int;
  v_boxes int;
  v_box jsonb;
  v_sold int;
begin
  -- Promo code usage limit, counted over orders that are still alive (FR31).
  if v_promo is not null then
    perform pg_advisory_xact_lock(hashtext('promo:' || v_promo::text));
    select max_uses into v_max_uses from promo_codes where id = v_promo and is_active;
    if not found then raise exception 'PROMO_INVALID'; end if;
    if v_max_uses is not null then
      select count(*) into v_used from orders
        where promo_code_id = v_promo and status not in ('CANCELLED', 'EXPIRED');
      if v_used >= v_max_uses then raise exception 'PROMO_USED_UP'; end if;
    end if;
  end if;

  -- Blindbox stock (FR32): same rule, boxes in live orders count as sold.
  select coalesce(sum((i->>'quantity')::int), 0) into v_boxes
    from jsonb_array_elements(p_items) i where i->>'type' = 'BLINDBOX';
  if v_boxes > 0 then
    perform pg_advisory_xact_lock(hashtext('blindbox'));
    select value into v_box from settings where key = 'blindbox';
    if v_box is null or not coalesce((v_box->>'is_active')::boolean, false) then
      raise exception 'BLINDBOX_OFF';
    end if;
    select coalesce(sum(oi.quantity), 0) into v_sold
      from order_items oi join orders o on o.id = oi.order_id
      where oi.type::text = 'BLINDBOX' and o.status not in ('CANCELLED', 'EXPIRED');
    if v_sold + v_boxes > coalesce((v_box->>'stock')::int, 0) then
      raise exception 'BLINDBOX_SOLD_OUT';
    end if;
  end if;

  insert into orders (
    source, customer_name, phone, email, fulfillment, address, preferred_time,
    pickup_location, note, items_total, discount_amount, discount_note, promo_code_id,
    subtotal, prepay_percent, prepay_amount, paid_amount,
    status, payment_status, expires_at, created_by, customer_id
  ) values (
    coalesce((p_order->>'source')::order_source, 'WEB'),
    p_order->>'customer_name',
    p_order->>'phone',
    p_order->>'email',
    (p_order->>'fulfillment')::fulfillment_type,
    p_order->>'address',
    p_order->>'preferred_time',
    p_order->>'pickup_location',
    p_order->>'note',
    coalesce((p_order->>'items_total')::int, (p_order->>'subtotal')::int),
    coalesce((p_order->>'discount_amount')::int, 0),
    p_order->>'discount_note',
    v_promo,
    (p_order->>'subtotal')::int,
    (p_order->>'prepay_percent')::int,
    (p_order->>'prepay_amount')::int,
    coalesce((p_order->>'paid_amount')::int, 0),
    coalesce((p_order->>'status')::order_status, 'PENDING_PAYMENT'),
    coalesce((p_order->>'payment_status')::payment_status, 'UNPAID'),
    (p_order->>'expires_at')::timestamptz,
    (p_order->>'created_by')::uuid,
    (p_order->>'customer_id')::uuid
  )
  returning * into v_order;

  -- Workshop cash: the money received on the spot.
  if p_order ? 'payment' and jsonb_typeof(p_order->'payment') = 'object' then
    insert into payments (order_id, amount, method, note, recorded_by)
    values (
      v_order.id,
      (p_order->'payment'->>'amount')::int,
      (p_order->'payment'->>'method')::payment_method,
      p_order->'payment'->>'note',
      (p_order->>'created_by')::uuid
    );
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_design_id := null;
    v_type := (v_item->>'type')::item_type;
    v_design := v_item->'design';
    if v_design is not null and jsonb_typeof(v_design) = 'object' then
      insert into designs (source, canvas_json, preview_url)
      values ((v_design->>'source')::design_source, v_design->'canvas_json', v_design->>'preview_url')
      returning designs.id into v_design_id;

      for v_file in select * from jsonb_array_elements(coalesce(v_design->'files', '[]'::jsonb)) loop
        insert into design_files (design_id, area, file_path, width_px, height_px)
        values (
          v_design_id,
          v_file->>'area',
          v_file->>'file_path',
          (v_file->>'width_px')::int,
          (v_file->>'height_px')::int
        );
      end loop;
    elsif v_type = 'PROTOTYPE' then
      -- The prototype's current design, locked into the order (print files never change).
      select design_id into strict v_design_id from prototypes
        where id = (v_item->>'prototype_id')::uuid and is_active;
    end if;

    insert into order_items (order_id, type, color, size, quantity, unit_price, design_id, prototype_id, approval_status)
    values (
      v_order.id,
      v_type,
      coalesce(v_item->>'color', ''),   -- '' for blindbox lines
      coalesce(v_item->>'size', ''),
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::int,
      v_design_id,
      case when v_type = 'PROTOTYPE' then (v_item->>'prototype_id')::uuid end,
      case when v_type = 'CUSTOM'
        then coalesce((v_item->>'approval_status')::approval_status, 'PENDING_APPROVAL')
      end
    );
  end loop;

  insert into order_status_history (order_id, from_status, to_status, note, changed_by)
  values (v_order.id, null, v_order.status, p_order->>'history_note', (p_order->>'created_by')::uuid);

  return jsonb_build_object('id', v_order.id, 'code', v_order.code, 'access_token', v_order.access_token);
end $$;

-- Live usage per promo code and boxes sold, for the admin pages and checkout.
create or replace function promo_code_usage()
returns table (promo_code_id uuid, used int)
language sql stable
as $$
  select promo_code_id, count(*)::int from orders
  where promo_code_id is not null and status not in ('CANCELLED', 'EXPIRED')
  group by promo_code_id
$$;

create or replace function blindbox_sold()
returns int
language sql stable
as $$
  select coalesce(sum(oi.quantity), 0)::int
  from order_items oi join orders o on o.id = oi.order_id
  where oi.type::text = 'BLINDBOX' and o.status not in ('CANCELLED', 'EXPIRED')
$$;

revoke execute on function create_order(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function promo_code_usage() from public, anon, authenticated;
revoke execute on function blindbox_sold() from public, anon, authenticated;
grant execute on function create_order(jsonb, jsonb) to service_role;
grant execute on function promo_code_usage() to service_role;
grant execute on function blindbox_sold() to service_role;
