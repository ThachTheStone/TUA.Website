-- FR16, FR29, FR32 (07/10/2026)
--   • Custom kind per custom shirt: UPLOAD (image file), LINK (Drive link / prototype look,
--     added by staff later), SELF (the buyer designs it: website canvas, or later for Workshop).
--     LINK and Workshop SELF shirts start without print files; design_link holds the Drive link.
--   • create_order stores both fields (otherwise the same as 0012).
--   • set_design_link: staff add or change the link, logged in the order history.
--   • Blindbox Hot Wheels: 4 boxes left from now.

create type custom_kind as enum ('UPLOAD', 'LINK', 'SELF');

alter table order_items
  add column custom_kind custom_kind,
  add column design_link text check (design_link is null or length(design_link) <= 500);

-- Existing custom shirts: website canvas = Tự thiết kế, Workshop scan = uploaded image.
update order_items oi
   set custom_kind = case when d.source = 'CANVAS' then 'SELF'::custom_kind else 'UPLOAD'::custom_kind end
  from designs d
 where oi.design_id = d.id and oi.type = 'CUSTOM';

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
  v_need record;
  v_limit int;
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

  -- Blank shirt stock per colour × size, and prototype caps. One lock for all shirt stock.
  if exists (select 1 from jsonb_array_elements(p_items) i where i->>'type' <> 'BLINDBOX') then
    perform pg_advisory_xact_lock(hashtext('shirt_stock'));

    for v_need in
      select i->>'color' as color, i->>'size' as size, sum((i->>'quantity')::int) as qty
      from jsonb_array_elements(p_items) i where i->>'type' <> 'BLINDBOX'
      group by 1, 2
    loop
      select quantity into v_limit from shirt_stock s where s.color = v_need.color and s.size = v_need.size;
      if found then
        select coalesce(sum(oi.quantity), 0) into v_sold
          from order_items oi join orders o on o.id = oi.order_id
          where oi.type::text <> 'BLINDBOX' and oi.color = v_need.color and oi.size = v_need.size
            and o.status not in ('CANCELLED', 'EXPIRED');
        if v_sold + v_need.qty > v_limit then
          raise exception 'SHIRT_SOLD_OUT:%:%:%', v_need.color, v_need.size, greatest(v_limit - v_sold, 0);
        end if;
      end if;
    end loop;

    for v_need in
      select (i->>'prototype_id')::uuid as id, sum((i->>'quantity')::int) as qty
      from jsonb_array_elements(p_items) i where i->>'type' = 'PROTOTYPE'
      group by 1
    loop
      select stock_limit into v_limit from prototypes where id = v_need.id;
      if v_limit is not null then
        select coalesce(sum(oi.quantity), 0) into v_sold
          from order_items oi join orders o on o.id = oi.order_id
          where oi.prototype_id = v_need.id and o.status not in ('CANCELLED', 'EXPIRED');
        if v_sold + v_need.qty > v_limit then
          raise exception 'PROTOTYPE_SOLD_OUT:%:%', v_need.id, greatest(v_limit - v_sold, 0);
        end if;
      end if;
    end loop;
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

    insert into order_items (
      order_id, type, color, size, quantity, unit_price, design_id, prototype_id, approval_status,
      custom_kind, design_link
    )
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
      end,
      case when v_type = 'CUSTOM' then coalesce((v_item->>'custom_kind')::custom_kind, 'SELF') end,
      case when v_type = 'CUSTOM' then nullif(v_item->>'design_link', '') end
    );
  end loop;

  insert into order_status_history (order_id, from_status, to_status, note, changed_by)
  values (v_order.id, null, v_order.status, p_order->>'history_note', (p_order->>'created_by')::uuid);

  return jsonb_build_object('id', v_order.id, 'code', v_order.code, 'access_token', v_order.access_token);
end $$;

create or replace function set_design_link(p_item_id uuid, p_link text, p_note text, p_user uuid)
returns boolean
language plpgsql
as $$
declare
  v_order uuid;
  v_status order_status;
begin
  update order_items set design_link = p_link
   where id = p_item_id and type = 'CUSTOM'
  returning order_id into v_order;
  if not found then return false; end if;

  update orders set updated_at = now() where id = v_order returning status into v_status;
  insert into order_status_history (order_id, from_status, to_status, note, changed_by)
  values (v_order, v_status, v_status, p_note, p_user);
  return true;
end $$;

revoke execute on function create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function create_order(jsonb, jsonb) to service_role;
revoke execute on function set_design_link(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function set_design_link(uuid, text, text, uuid) to service_role;

-- Blindbox: total = boxes already in live orders + 4, so the shop shows "Còn 4 hộp".
-- Later changes: Admin → Kho áo → Blindbox (enter the number left).
update settings
   set value = jsonb_set(
     value,
     '{stock}',
     to_jsonb(4 + (
       select coalesce(sum(oi.quantity), 0)::int
         from order_items oi join orders o on o.id = oi.order_id
        where oi.type::text = 'BLINDBOX' and o.status not in ('CANCELLED', 'EXPIRED')
     ))
   )
 where key = 'blindbox';
