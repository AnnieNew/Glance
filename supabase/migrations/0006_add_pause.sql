alter table public.profiles
  add column paused boolean not null default false;
