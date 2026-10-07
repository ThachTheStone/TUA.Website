-- FR14/FR15: correcting an order after the fact.
--   • adjust_paid_amount: Admin re-enters the total actually received (a typo in "Đã cọc", a
--     second transfer…). Payment status follows the new total.
--   • update_order_info: Staff/Admin fix the buyer's contact and delivery details.
-- Both write the change and the new values in one statement, plus a history row whose
-- from_status = to_status (an edit, not a status change), so the log can never miss an edit.

create or replace function adjust_paid_amount(
  p_order_id uuid,
  p_expected_paid int,
  p_new_paid int,
  p_to_payment payment_status,
  p_note text,
  p_user uuid
) returns boolean
language plpgsql
as $$
declare
  v_status order_status;
begin
  update orders
     set paid_amount = p_new_paid, payment_status = p_to_payment, updated_at = now()
   where id = p_order_id and paid_amount = p_expected_paid
  returning status into v_status;
  if not found then return false; end if;

  insert into order_status_history (order_id, from_status, to_status, note, changed_by)
  values (p_order_id, v_status, v_status, p_note, p_user);
  return true;
end $$;

create or replace function update_order_info(
  p_order_id uuid,
  p_expected_status order_status,
  p_customer_name text,
  p_phone text,
  p_email text,
  p_fulfillment fulfillment_type,
  p_address text,
  p_preferred_time text,
  p_pickup_location text,
  p_order_note text,
  p_note text,
  p_user uuid
) returns boolean
language plpgsql
as $$
begin
  update orders
     set customer_name = p_customer_name,
         phone = p_phone,
         email = p_email,
         fulfillment = p_fulfillment,
         address = p_address,
         preferred_time = p_preferred_time,
         pickup_location = p_pickup_location,
         note = p_order_note,
         updated_at = now()
   where id = p_order_id and status = p_expected_status;
  if not found then return false; end if;

  insert into order_status_history (order_id, from_status, to_status, note, changed_by)
  values (p_order_id, p_expected_status, p_expected_status, p_note, p_user);
  return true;
end $$;

revoke execute on function adjust_paid_amount(uuid, int, int, payment_status, text, uuid) from public, anon, authenticated;
grant execute on function adjust_paid_amount(uuid, int, int, payment_status, text, uuid) to service_role;
revoke execute on function update_order_info(uuid, order_status, text, text, text, fulfillment_type, text, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function update_order_info(uuid, order_status, text, text, text, fulfillment_type, text, text, text, text, text, uuid) to service_role;
