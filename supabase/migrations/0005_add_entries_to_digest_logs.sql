alter table public.digest_logs
  add column entries jsonb not null default '[]'::jsonb;
