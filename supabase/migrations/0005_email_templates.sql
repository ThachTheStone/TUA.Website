-- Phase 5b (FR30): admin-edited email templates.
-- Defaults live in code (src/lib/email/templates.ts). A row exists only once an admin has
-- edited that template; "Khôi phục mặc định" deletes the row.

create table email_templates (
  key text primary key,
  subject text not null,
  body text not null,
  is_enabled boolean not null default true,
  updated_by uuid references profiles on delete set null,
  updated_at timestamptz not null default now()
);

-- Server code only (service role).
alter table email_templates enable row level security;
