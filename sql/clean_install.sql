-- Core tables
create table if not exists public.sessions (
  id text primary key,
  school_id uuid,
  grade int,
  item_index int not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  item_id text not null,
  domain text not null,
  correct boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists attempts_session_idx on public.attempts (session_id);

-- Decision flow
do $$ begin create type decision_status as enum ('pending','decided','notified'); exception when duplicate_object then null; end $$;
do $$ begin create type overall_decision as enum ('accept','review','decline'); exception when duplicate_object then null; end $$;

create table if not exists public.expectations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  grade int not null,
  domain text not null check (domain in ('English','Maths','Reasoning','Readiness')),
  pass_threshold int not null check (pass_threshold between 0 and 100),
  updated_at timestamptz not null default now(),
  unique (school_id, grade, domain)
);

create index if not exists expectations_school_grade_idx on public.expectations (school_id, grade);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  session_id text not null,
  student_name text,
  student_email text,
  grade int not null,
  status decision_status not null default 'pending',
  decision overall_decision,
  decision_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospects_school_idx on public.prospects (school_id, grade);
create index if not exists prospects_session_idx on public.prospects (session_id);

create or replace view public.expectations_matrix as
select school_id, grade,
       max(case when domain='English'   then pass_threshold end) as english_threshold,
       max(case when domain='Maths'     then pass_threshold end) as maths_threshold,
       max(case when domain='Reasoning' then pass_threshold end) as reasoning_threshold,
       max(case when domain='Readiness' then pass_threshold end) as readiness_threshold
from public.expectations
group by school_id, grade;
