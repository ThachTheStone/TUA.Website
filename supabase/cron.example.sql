-- FR25 + NFR06 schedules. Vercel Hobby cron runs only once a day, so Supabase calls the site.
-- Run once per environment in the Supabase SQL editor, after replacing:
--   https://YOUR-DOMAIN   → the site URL (NEXT_PUBLIC_SITE_URL)
--   YOUR_CRON_SECRET      → the CRON_SECRET env var of that deployment
-- Do not commit the real secret. Re-running is safe: cron.schedule replaces a job with the same name.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Every 15 minutes: unpaid orders past their deadline → Hết hạn, email, Sheets resync.
select cron.schedule('expire-orders', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://YOUR-DOMAIN/api/cron/expire-orders',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    timeout_milliseconds := 30000
  )
$$);

-- Daily at 03:00 Vietnam time (20:00 UTC): delete buyer photos older than 30 days that no live order uses.
select cron.schedule('cleanup-uploads', '0 20 * * *', $$
  select net.http_post(
    url := 'https://YOUR-DOMAIN/api/cron/cleanup-uploads',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    timeout_milliseconds := 60000
  )
$$);

-- Check:   select jobname, schedule, active from cron.job;
-- History: select * from cron.job_run_details order by start_time desc limit 20;
--          select * from net._http_response order by created desc limit 20;
-- Remove:  select cron.unschedule('expire-orders');
