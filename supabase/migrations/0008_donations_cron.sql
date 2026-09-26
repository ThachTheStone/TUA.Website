-- Phase 8 (FR08, FR09, FR18, FR25, NFR06): donations, expiry job, cleanup of buyer uploads.
-- The pg_cron schedules that call /api/cron/* are in supabase/cron.example.sql (they need the
-- site URL and CRON_SECRET, so they are run by hand once per environment).

-- ─── Donations ──────────────────────────────────────────────────────────────
-- The QR page is opened through a link carrying this token, like the order payment page,
-- so donation codes (UH0001, UH0002, …) can't be enumerated.
alter table donations
  add column access_token uuid not null default gen_random_uuid(),
  add column confirmed_at timestamptz,
  add column updated_at timestamptz default now();

alter table donations
  add constraint donations_message_len check (message is null or char_length(message) <= 300),
  add constraint donations_name_len check (char_length(display_name) between 1 and 100),
  add constraint donations_contact_len check (char_length(contact) between 1 and 200);

create index donations_status_idx on donations (status, created_at desc);

create trigger donations_set_updated_at before update on donations
  for each row execute function set_updated_at();

-- ─── NFR06: buyer uploads older than 30 days that no live order uses ────────
-- A design uses a photo when its canvas_json.assets lists the design_assets id. Orders that
-- are EXPIRED or CANCELLED don't keep photos alive; replaced designs (resubmit) aren't linked
-- to any order item any more, so they don't either.
create or replace function stale_design_assets(p_before timestamptz, p_limit int default 500)
returns table (id uuid, file_path text)
language sql
stable
as $$
  select a.id, a.file_path
  from design_assets a
  where a.created_at < p_before
    and not exists (
      select 1
      from order_items i
      join orders o on o.id = i.order_id
      join designs d on d.id = i.design_id
      where o.status not in ('EXPIRED', 'CANCELLED')
        and d.canvas_json -> 'assets' ? a.id::text
    )
  order by a.created_at
  limit p_limit;
$$;

revoke execute on function stale_design_assets(timestamptz, int) from public, anon, authenticated;
grant execute on function stale_design_assets(timestamptz, int) to service_role;
