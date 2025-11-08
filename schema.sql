-- Basic sessions table + helpful index + (optional) RLS policy
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  public_token text unique not null,
  status text not null default 'pending',
  item_index int not null default 0,
  created_at timestamptz not null default now(),
  visited_at timestamptz
);

create index if not exists idx_sessions_token on public.sessions(public_token);

-- Allow anon to select rows by token (optional; server already uses service key)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='sessions' and policyname='sessions_read_by_token'
  ) then
    alter table public.sessions enable row level security;
    create policy "sessions_read_by_token"
    on public.sessions for select
    using (public_token is not null);
  end if;
end $$;
