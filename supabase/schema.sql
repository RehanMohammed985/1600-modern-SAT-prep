-- PrepPilot MVP schema (run in Supabase SQL editor)

create extension if not exists "uuid-ossp";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  grade text check (grade in ('9th', '10th', '11th', '12th')),
  current_score integer check (current_score between 400 and 1600),
  target_score integer check (target_score between 400 and 1600),
  test_date date,
  study_minutes_per_day integer check (study_minutes_per_day between 5 and 180),
  onboarding_completed boolean not null default false,
  sat_experience text check (sat_experience in ('never', 'practice', 'official')),
  test_track text check (test_track in ('sat', 'act', 'undecided')),
  registered_for_test boolean,
  test_timeline text check (test_timeline in ('not_sure', 'within_3_months', 'within_6_months', 'this_year', 'next_year')),
  study_plan_label text,
  beginner_path boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Questions bank
create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  prompt text not null,
  choices jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  explanation text not null,
  skill_tag text not null,
  difficulty integer not null check (difficulty between 1 and 5),
  estimated_seconds integer not null default 90,
  section text not null check (section in ('math', 'reading')),
  created_at timestamptz not null default now()
);

create index if not exists questions_skill_tag_idx on public.questions (skill_tag);
create index if not exists questions_difficulty_idx on public.questions (difficulty);

-- Study sessions
create type public.session_phase as enum (
  'warmup',
  'focus',
  'mixed',
  'review',
  'complete'
);

create table if not exists public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  current_phase public.session_phase not null default 'warmup',
  phase_plan jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists study_sessions_student_idx on public.study_sessions (student_id, started_at desc);

-- Attempts
create table if not exists public.attempts (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  session_id uuid references public.study_sessions (id) on delete set null,
  answer text not null,
  is_correct boolean not null,
  time_taken_seconds integer not null check (time_taken_seconds >= 0),
  created_at timestamptz not null default now()
);

create index if not exists attempts_student_idx on public.attempts (student_id, created_at desc);
create index if not exists attempts_skill_lookup_idx on public.attempts (student_id, question_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Table grants (authenticated role needs explicit access)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.profiles to anon;
grant select on table public.questions to authenticated;
grant select, insert, update on table public.study_sessions to authenticated;
grant select, insert on table public.attempts to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.study_sessions enable row level security;
alter table public.attempts enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "questions_read_all" on public.questions for select to authenticated using (true);

create policy "sessions_select_own" on public.study_sessions for select using (auth.uid() = student_id);
create policy "sessions_insert_own" on public.study_sessions for insert with check (auth.uid() = student_id);
create policy "sessions_update_own" on public.study_sessions for update using (auth.uid() = student_id);

create policy "attempts_select_own" on public.attempts for select using (auth.uid() = student_id);
create policy "attempts_insert_own" on public.attempts for insert with check (auth.uid() = student_id);
