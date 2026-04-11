alter table public.digest_logs
  add column source text not null default 'cron'
  check (source in ('cron', 'manual'));
