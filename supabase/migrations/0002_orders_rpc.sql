-- Phase 4: atomic order creation and status transitions (FR07, SRS §5).
-- Both functions are called only by server code with the service role.

-- Unguessable token for the payment page link (/thanh-toan/TUA0001?t=...).
-- Order codes are sequential, so the code alone must never grant access.
alter table orders add column if not exists access_token uuid not null default gen_random_uuid();

-- Creates an order, its items, designs, design files and the first history row
-- in one transaction. Money fields are computed by the server before calling this.
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
    status, expires_at, created_by
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
    (p_order->>'created_by')::uuid
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

-- Moves an order from p_from to p_to only if it is still in p_from (optimistic lock),
-- applies optional field changes and writes the history row. Returns false when the
-- order changed in the meantime. Allowed transitions are checked in lib/orders.
create or replace function transition_order(
  p_order_id uuid,
  p_from order_status,
  p_to order_status,
  p_note text default null,
  p_changed_by uuid default null,
  p_patch jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
as $$
begin
  update orders set
    status = p_to,
    refund_status = coalesce((p_patch->>'refund_status')::refund_status, refund_status),
    cancel_reason = coalesce(p_patch->>'cancel_reason', cancel_reason)
  where id = p_order_id and status = p_from;

  if not found then
    return false;
  end if;

  insert into order_status_history (order_id, from_status, to_status, note, changed_by)
  values (p_order_id, p_from, p_to, p_note, p_changed_by);
  return true;
end $$;

-- Only the service role may call these (all public access goes through server code).
revoke execute on function create_order(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function transition_order(uuid, order_status, order_status, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function create_order(jsonb, jsonb) to service_role;
grant execute on function transition_order(uuid, order_status, order_status, text, uuid, jsonb) to service_role;
