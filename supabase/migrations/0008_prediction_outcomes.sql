create table public.prediction_outcomes (
  id              uuid primary key default gen_random_uuid(),
  digest_log_id   uuid references public.digest_logs(id) on delete cascade not null,
  ticker          text not null,
  sentiment       text not null check (sentiment in ('bullish', 'bearish')),
  sent_at         timestamptz not null,
  price_at_send   numeric not null,
  t1_close        numeric,
  t3_close        numeric,
  t5_close        numeric,
  unique(digest_log_id, ticker)
);
