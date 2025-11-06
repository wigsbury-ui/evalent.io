-- Core (no RLS yet – we’ll harden later)
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  email text unique,
  full_name text,
  role text check (role in ('owner','admin','assessor','viewer')) default 'viewer',
  created_at timestamptz default now()
);

create table if not exists public.school_users (
  school_id uuid references public.schools(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text check (role in ('owner','admin','assessor','viewer')) not null,
  primary key (school_id, user_id)
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  item_id text unique,
  programme text,
  grade text,
  domain text,
  type text,                -- mcq/short/free/nonverbal
  stem text,
  options jsonb,            -- ["A", "B", "C", "D"] if mcq
  answer text,              -- "A" or free-text key
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  item_id text references public.items(item_id) on delete set null,
  video_title text,
  video_url text,
  share_url text,
  download_url text,
  thumbnail_url text,
  talking_photo_id text,
  avatar_id text,
  voice_id text,
  background text,
  resolution text,
  status text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.blueprints (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  name text not null,
  programme text not null,
  grade text not null,
  config jsonb not null,     -- targets per domain, counts, timing
  pass_logic jsonb not null, -- thresholds/weights
  created_at timestamptz default now()
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  grade_applied text,
  guardian_email text,
  created_at timestamptz default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete cascade,
  blueprint_id uuid references public.blueprints(id) on delete set null,
  status text check (status in ('created','in_progress','finished')) default 'created',
  item_index int default 0,
  token text unique,
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  item_id text references public.items(item_id) on delete set null,
  response jsonb,
  correct boolean,
  score numeric,
  created_at timestamptz default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  summary jsonb,
  recommendation text,
  pdf_url text,
  created_at timestamptz default now()
);
