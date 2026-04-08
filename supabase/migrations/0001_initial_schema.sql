-- profiles: mirrors auth.users, auto-created by trigger
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- subscriptions: ticker watchlist per user (max 20 enforced in app)
create table public.subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  ticker     text not null,
  company    text not null,
  created_at timestamptz not null default now(),
  unique(user_id, ticker)
);

alter table public.subscriptions enable row level security;
create policy "Users manage own subscriptions"
  on public.subscriptions for all using (auth.uid() = user_id);

create index idx_subscriptions_user_id on public.subscriptions(user_id);


-- digest_logs: audit trail, prevents double-send on cron retries
create table public.digest_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  sent_at      timestamptz not null default now(),
  ticker_count int not null,
  status       text not null check (status in ('sent', 'failed'))
);

create index idx_digest_logs_user_date
  on public.digest_logs(user_id, sent_at);
