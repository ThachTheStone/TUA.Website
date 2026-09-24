-- Phase 6 (BR01, FR03, FR29): buyer photos/stickers in the canvas, and resubmitting a
-- rejected design.

-- Private bucket: files are only reachable through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('uploads', 'uploads', false, 10485760, array['image/png','image/jpeg'])
on conflict (id) do nothing;

create table design_assets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers on delete cascade,
  file_path text not null unique,       -- '<customer_id>/<id>.<ext>' in bucket 'uploads'
  width_px int not null check (width_px > 0),
  height_px int not null check (height_px > 0),
  bytes int not null check (bytes > 0),
  created_at timestamptz not null default now()
);
create index design_assets_customer_idx on design_assets (customer_id, created_at desc);
alter table design_assets enable row level security;   -- server code only

-- The buyer replaces a REJECTED design (FR29): new design + files, back to PENDING_APPROVAL,
-- one design_reviews row with changed_by null. Ownership is checked by the caller.
create or replace function resubmit_design(p_item_id uuid, p_design jsonb)
returns boolean
language plpgsql
as $$
declare
  v_design_id uuid;
  v_file jsonb;
begin
  perform 1 from order_items where id = p_item_id and approval_status = 'REJECTED' for update;
  if not found then
    return false;
  end if;

  insert into designs (source, canvas_json, preview_url)
  values ('CANVAS', p_design->'canvas_json', p_design->>'preview_url')
  returning id into v_design_id;

  for v_file in select * from jsonb_array_elements(coalesce(p_design->'files', '[]'::jsonb)) loop
    insert into design_files (design_id, area, file_path, width_px, height_px)
    values (v_design_id, v_file->>'area', v_file->>'file_path', (v_file->>'width_px')::int, (v_file->>'height_px')::int);
  end loop;

  update order_items set
    design_id = v_design_id,
    approval_status = 'PENDING_APPROVAL',
    reject_reason = null,
    reviewed_by = null,
    reviewed_at = now()
  where id = p_item_id;

  insert into design_reviews (order_item_id, from_status, to_status, reason, design_id, changed_by)
  values (p_item_id, 'REJECTED', 'PENDING_APPROVAL', 'Khách gửi lại thiết kế', v_design_id, null);
  return true;
end $$;

revoke execute on function resubmit_design(uuid, jsonb) from public, anon, authenticated;
grant execute on function resubmit_design(uuid, jsonb) to service_role;
