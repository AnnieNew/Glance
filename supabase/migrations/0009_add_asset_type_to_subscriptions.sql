alter table public.subscriptions
  add column asset_type text check (asset_type in ('stock', 'etf')) default null;
