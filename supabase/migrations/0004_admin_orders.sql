-- Phase 5: payment status (SRS §5.2), design approval (§5.3, FR29), admin order list (FR13).

-- ─── Payment status ─────────────────────────────────────────────────────────
create type payment_status as enum ('UNPAID','DEPOSIT_PAID','FULLY_PAID');
alter table orders add column payment_status payment_status not null default 'UNPAID';
-- Orders confirmed before this migration already had their deposit recorded.
update orders set payment_status = case when paid_amount >= subtotal then 'FULLY_PAID'::payment_status
                                        else 'DEPOSIT_PAID'::payment_status end
  where paid_amount > 0;
create index orders_payment_status_idx on orders (payment_status);

-- ─── Design approval (one status per custom shirt) ─────────────────────────
create type approval_status as enum ('PENDING_APPROVAL','UNDER_REVIEW','APPROVED','REJECTED');
alter table order_items
  add column approval_status approval_status,
  add column reject_reason text,
  add column reviewed_by uuid references profiles,
  add column reviewed_at timestamptz;
update order_items set approval_status = 'PENDING_APPROVAL' where type = 'CUSTOM';
alter table order_items add constraint order_items_approval_check
  check ((type = 'CUSTOM') = (approval_status is not null));
create index order_items_approval_idx on order_items (approval_status) where approval_status is not null;

create table design_reviews (
  id bigserial primary key,
  order_item_id uuid not null references order_items on delete cascade,
  from_status approval_status,
  to_status approval_status not null,
  reason text,
  design_id uuid references designs,
  changed_by uuid references profiles,   -- null = the buyer resubmitted
  changed_at timestamptz default now()
);
create index design_reviews_item_idx on design_reviews (order_item_id);
alter table design_reviews enable row level security;

-- ─── create_order: payment status, first payment, approval per item ───────
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
    end if;

    insert into order_items (order_id, type, color, size, quantity, unit_price, design_id, approval_status)
    values (
      v_order.id,
      v_type,
      v_item->>'color',
      v_item->>'size',
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::int,
      v_design_id,
      case when v_type = 'CUSTOM'
        then coalesce((v_item->>'approval_status')::approval_status, 'PENDING_APPROVAL')
      end
    );
  end loop;

  insert into order_status_history (order_id, from_status, to_status, note, changed_by)
  values (v_order.id, null, v_order.status, p_order->>'history_note', (p_order->>'created_by')::uuid);

  return jsonb_build_object('id', v_order.id, 'code', v_order.code, 'access_token', v_order.access_token);
end $$;

-- ─── "Đã cọc" / "Đã thanh toán 100%" ────────────────────────────────────────
-- Records one payment and moves the payment status (and optionally the order status)
-- only if the order is still exactly as the caller saw it. Rules live in lib/orders/payments.ts.
create or replace function confirm_payment(
  p_order_id uuid,
  p_from_status order_status,
  p_to_status order_status,
  p_from_payment payment_status,
  p_to_payment payment_status,
  p_expected_paid int,
  p_amount int,
  p_method payment_method,
  p_note text,
  p_user uuid
)
returns boolean
language plpgsql
as $$
begin
  update orders set
    paid_amount = paid_amount + p_amount,
    payment_status = p_to_payment,
    status = p_to_status
  where id = p_order_id
    and status = p_from_status
    and payment_status = p_from_payment
    and paid_amount = p_expected_paid;

  if not found then
    return false;
  end if;

  insert into payments (order_id, amount, method, note, recorded_by)
  values (p_order_id, p_amount, p_method, p_note, p_user);

  if p_to_status <> p_from_status then
    insert into order_status_history (order_id, from_status, to_status, note, changed_by)
    values (p_order_id, p_from_status, p_to_status, p_note, p_user);
  end if;
  return true;
end $$;

-- ─── Design review step (FR29) ──────────────────────────────────────────────
create or replace function review_design(
  p_item_id uuid,
  p_from approval_status,
  p_to approval_status,
  p_reason text,
  p_user uuid
)
returns boolean
language plpgsql
as $$
begin
  update order_items set
    approval_status = p_to,
    reject_reason = case when p_to = 'REJECTED' then p_reason end,
    reviewed_by = p_user,
    reviewed_at = now()
  where id = p_item_id and approval_status = p_from;

  if not found then
    return false;
  end if;

  insert into design_reviews (order_item_id, from_status, to_status, reason, design_id, changed_by)
  select id, p_from, p_to, p_reason, design_id, p_user from order_items where id = p_item_id;
  return true;
end $$;

-- ─── Admin order list (FR13) ────────────────────────────────────────────────
-- security_invoker: callers without an orders policy (anon, buyers) see nothing.
create view order_overview with (security_invoker = true) as
select
  o.id, o.code, o.source, o.customer_name, o.phone, o.email, o.fulfillment,
  o.subtotal, o.prepay_amount, o.paid_amount, o.status, o.payment_status, o.refund_status,
  o.expires_at, o.created_at,
  coalesce(d.pending, 0)::int as pending_designs,
  coalesce(d.rejected, 0)::int as rejected_designs
from orders o
left join lateral (
  select
    count(*) filter (where i.approval_status in ('PENDING_APPROVAL','UNDER_REVIEW')) as pending,
    count(*) filter (where i.approval_status = 'REJECTED') as rejected
  from order_items i where i.order_id = o.id
) d on true;
revoke all on order_overview from anon, authenticated;

-- Counters at the top of the order list.
create or replace function order_counts()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'by_status', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from (select status, count(*) as n from orders group by status) s
    ),
    'pending_designs', (
      select count(distinct i.order_id)
      from order_items i join orders o on o.id = i.order_id
      where i.approval_status in ('PENDING_APPROVAL','UNDER_REVIEW')
        and o.status not in ('CANCELLED','EXPIRED')
    ),
    'debts', (select count(*) from orders where status = 'DELIVERED' and payment_status = 'DEPOSIT_PAID')
  )
$$;

-- Only the service role (server code) may call these.
revoke execute on function create_order(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function confirm_payment(uuid, order_status, order_status, payment_status, payment_status, int, int, payment_method, text, uuid)
  from public, anon, authenticated;
revoke execute on function review_design(uuid, approval_status, approval_status, text, uuid) from public, anon, authenticated;
revoke execute on function order_counts() from public, anon, authenticated;
grant execute on function create_order(jsonb, jsonb) to service_role;
grant execute on function confirm_payment(uuid, order_status, order_status, payment_status, payment_status, int, int, payment_method, text, uuid)
  to service_role;
grant execute on function review_design(uuid, approval_status, approval_status, text, uuid) to service_role;
grant execute on function order_counts() to service_role;
