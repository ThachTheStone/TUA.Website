-- Phase 7 (FR27, FR28, FR02, FR06): ready-made shirt designs ("Áo mẫu") and the
-- organizer contact shown on phones (FR03, FR21).
--
-- New enum values cannot be used as literals in the same transaction that adds them,
-- so nothing below compares against 'PROTOTYPE' outside a function body.

alter type item_type add value if not exists 'PROTOTYPE';
alter type design_source add value if not exists 'PROTOTYPE';

create table prototypes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  color text not null,                        -- settings.colors[].key, fixed per prototype
  image_urls text[] not null default '{}',    -- 1–4 display images (public `content` bucket)
  design_id uuid not null references designs, -- print files live in design_files ('designs' bucket, prototypes/<id>/)
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prototypes_sort_idx on prototypes (sort_order, created_at);
alter table prototypes enable row level security;
create policy "public read active prototypes" on prototypes
  for select to anon, authenticated using (is_active);

-- A prototype that is in an order can't be deleted, only deactivated (FR28).
alter table order_items add column prototype_id uuid references prototypes on delete restrict;
create index order_items_prototype_idx on order_items (prototype_id) where prototype_id is not null;

-- Organizer contact (FR21). Empty until the admin fills it in.
insert into settings (key, value) values
  ('contact', '{"phone":"","facebook":"","email":""}'::jsonb)
on conflict (key) do nothing;

-- ─── Create or update a prototype ───────────────────────────────────────────
-- Print files are immutable per design: when they change, a new designs row is created
-- and the prototype points at it, so orders placed earlier keep the files they were sold with.
-- p_files: null = keep the current design; otherwise [{area, file_path, width_px, height_px}].
create or replace function save_prototype(p_id uuid, p_fields jsonb, p_files jsonb)
returns uuid
language plpgsql
as $$
declare
  v_design_id uuid;
  v_file jsonb;
begin
  if p_files is not null then
    insert into designs (source, canvas_json, preview_url)
    values ('PROTOTYPE', null, null)
    returning id into v_design_id;

    for v_file in select * from jsonb_array_elements(p_files) loop
      insert into design_files (design_id, area, file_path, width_px, height_px)
      values (v_design_id, v_file->>'area', v_file->>'file_path', (v_file->>'width_px')::int, (v_file->>'height_px')::int);
    end loop;
  end if;

  update prototypes set
    slug = p_fields->>'slug',
    name = p_fields->>'name',
    description = p_fields->>'description',
    color = p_fields->>'color',
    image_urls = array(select jsonb_array_elements_text(p_fields->'image_urls')),
    design_id = coalesce(v_design_id, design_id),
    sort_order = (p_fields->>'sort_order')::int,
    is_active = (p_fields->>'is_active')::boolean,
    updated_at = now()
  where id = p_id;

  if not found then
    insert into prototypes (id, slug, name, description, color, image_urls, design_id, sort_order, is_active)
    values (
      p_id,
      p_fields->>'slug',
      p_fields->>'name',
      p_fields->>'description',
      p_fields->>'color',
      array(select jsonb_array_elements_text(p_fields->'image_urls')),
      v_design_id,   -- not null: a new prototype always comes with print files
      (p_fields->>'sort_order')::int,
      (p_fields->>'is_active')::boolean
    );
  end if;

  return p_id;
end $$;

-- ─── create_order: prototype lines reuse the prototype's design ────────────
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
begin
  insert into orders (
    source, customer_name, phone, email, fulfillment, address, preferred_time,
    pickup_location, note, subtotal, prepay_percent, prepay_amount, paid_amount,
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
      v_item->>'color',
      v_item->>'size',
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

-- Only the service role (server code) may call these.
revoke execute on function save_prototype(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function save_prototype(uuid, jsonb, jsonb) to service_role;
grant execute on function create_order(jsonb, jsonb) to service_role;
