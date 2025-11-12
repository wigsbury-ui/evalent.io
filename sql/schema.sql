-- UUID extension
create extension if not exists "uuid-ossp";

-- ========== Core tables ==========
create table if not exists public.items (
  id text primary key,
  year text not null,
  domain text not null,
  stem text not null,
  type text not null check (type in ('mcq','short')),
  options jsonb,
  correct text,
  programme text default 'UK'
);

create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null,
  year text not null,
  candidate_name text not null,
  status text not null default 'active' check (status in ('active','finished')),
  item_index int not null default 0,
  selected_ids jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.attempts (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  item_id text not null references public.items(id),
  response text,
  correct boolean,
  created_at timestamp with time zone default now()
);

create table if not exists public.assets (
  item_id text primary key references public.items(id) on delete cascade,
  video_title text,
  video_id text,
  share_url text,
  download_url text,
  duration_seconds numeric,
  avatar_voice_id text,
  avatar_style text,
  background text,
  resolution text,
  video_thumbnail text,
  script_audio text,
  script_audio_original text,
  intro text,
  outro text,
  a_intro text,
  b_intro text,
  c_intro text,
  d_intro text,
  "end" text,
  script_version text,
  current_script_hash text,
  last_rendered_script_hash text,
  error text,
  status text,
  __sheet text,
  programme text,
  _has_vid boolean,
  _has_share boolean,
  talking_photo_id text,
  notes text,
  player_url text
);

create table if not exists public.blueprints (
  id uuid primary key default uuid_generate_v4(),
  programme text not null,
  grade int not null,
  subject text not null,
  base_count int not null default 0,
  easy_count int not null default 0,
  core_count int not null default 0,
  hard_count int not null default 0
);

-- ========== RLS (read for anon) ==========
alter table public.items enable row level security;
do $$ begin
  create policy "read-items" on public.items for select using (true);
exception when duplicate_object then null; end $$;

alter table public.assets enable row level security;
do $$ begin
  create policy "read-assets" on public.assets for select using (true);
exception when duplicate_object then null; end $$;

alter table public.blueprints enable row level security;
do $$ begin
  create policy "read-blueprints" on public.blueprints for select using (true);
exception when duplicate_object then null; end $$;

-- ========== Helper RPCs ==========
create or replace function public.inc_session_item_index(p_session_id uuid)
returns void language plpgsql as $$
begin
  update public.sessions set item_index = item_index + 1 where id = p_session_id;
end $$;

-- ========== Compatibility views (work with existing schemas) ==========
create or replace view public.items_vw as
select
  id,
  year,
  domain,
  stem,
  type,
  options,
  correct,
  programme
from public.items;

create or replace view public.assets_vw as
select
  item_id,
  video_title,
  video_id,
  share_url,
  download_url,
  video_thumbnail,
  player_url
from public.assets;

create or replace view public.blueprints_vw as
select
  programme, grade, subject, base_count, easy_count, core_count, hard_count
from public.blueprints;
