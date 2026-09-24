-- FR26: buyer (customer) accounts, saved carts, and orders linked to the buyer.
-- Buyers sign in through Supabase Auth like staff, but live in their own table:
-- having a `customers` row never grants admin access (that needs a `profiles` row).

create table customers (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  phone text,                         -- Google sign-ups fill this at checkout
  created_at timestamptz default now()
);

-- One saved cart per buyer: the same shape as the browser cart (lib/cart/store.ts).
create table carts (
  customer_id uuid primary key references customers on delete cascade,
  items jsonb not null default '[]'::jsonb,
  drafts jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table orders add column customer_id uuid references customers on delete set null;
create index orders_customer_idx on orders (customer_id, created_at desc);

-- All reads and writes go through server code with the service role.
alter table customers enable row level security;
alter table carts enable row level security;

-- create_order now also stores the buyer.
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
begin
  insert into orders (
    source, customer_name, phone, email, fulfillment, address, preferred_time,
    pickup_location, note, subtotal, prepay_percent, prepay_amount, paid_amount,
    status, expires_at, created_by, customer_id
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
    (p_order->>'subtotal')::int,
    (p_order->>'prepay_percent')::int,
    (p_order->>'prepay_amount')::int,
    coalesce((p_order->>'paid_amount')::int, 0),
    coalesce((p_order->>'status')::order_status, 'PENDING_PAYMENT'),
    (p_order->>'expires_at')::timestamptz,
    (p_order->>'created_by')::uuid,
    (p_order->>'customer_id')::uuid
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_design_id := null;
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
    end if;

    insert into order_items (order_id, type, color, size, quantity, unit_price, design_id)
    values (
      v_order.id,
      (v_item->>'type')::item_type,
      v_item->>'color',
      v_item->>'size',
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::int,
      v_design_id
    );
  end loop;

  insert into order_status_history (order_id, from_status, to_status, note, changed_by)
  values (v_order.id, null, v_order.status, p_order->>'history_note', (p_order->>'created_by')::uuid);

  return jsonb_build_object('id', v_order.id, 'code', v_order.code, 'access_token', v_order.access_token);
end $$;

revoke execute on function create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function create_order(jsonb, jsonb) to service_role;
