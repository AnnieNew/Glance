-- Add a unique token to each digest log row (used in feedback URLs)
alter table public.digest_logs
  add column token uuid not null default gen_random_uuid() unique;

-- Store user feedback linked to a specific digest
create table public.feedback (
  id            uuid primary key default gen_random_uuid(),
  digest_log_id uuid not null references public.digest_logs(id) on delete cascade,
  rating        text not null check (rating in ('good', 'bad')),
  comment       text,
  created_at    timestamptz not null default now(),
  unique(digest_log_id)
);
