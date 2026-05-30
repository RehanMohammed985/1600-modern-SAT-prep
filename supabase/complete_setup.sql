-- Run this once in Supabase SQL Editor if onboarding save fails or you see permission errors.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).

-- 1) Onboarding columns (skip if you already ran schema.sql with these fields)
alter table public.profiles
  add column if not exists sat_experience text
    check (sat_experience in ('never', 'practice', 'official')),
  add column if not exists test_track text
    check (test_track in ('sat', 'act', 'undecided')),
  add column if not exists registered_for_test boolean,
  add column if not exists test_timeline text
    check (test_timeline in ('not_sure', 'within_3_months', 'within_6_months', 'this_year', 'next_year')),
  add column if not exists study_plan_label text,
  add column if not exists beginner_path boolean not null default false;

alter table public.profiles alter column current_score drop not null;

-- 2) Table grants
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.profiles to anon;
grant select on table public.questions to authenticated;
grant select, insert, update on table public.study_sessions to authenticated;
grant select, insert on table public.attempts to authenticated;

-- 3) RLS policies
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

-- 4) Tutoring experience columns & session phases (see migrations/20250525120000_tutoring_experience.sql)
alter table public.profiles
  add column if not exists comfort_level text
    check (comfort_level in ('lost', 'basics', 'improving', 'unsure')),
  add column if not exists parent_email text,
  add column if not exists test_signup_status text
    check (test_signup_status in ('signed_up', 'not_signed_up', 'not_sure')),
  add column if not exists slow_mode boolean not null default false,
  add column if not exists grade_path_label text,
  add column if not exists planned_test_date date;

alter table public.questions
  add column if not exists test_type text default 'sat',
  add column if not exists subskill text,
  add column if not exists concept_explanation text,
  add column if not exists formula_or_rule text,
  add column if not exists underlying_concept text,
  add column if not exists common_mistakes jsonb default '[]'::jsonb,
  add column if not exists mistake_types jsonb default '[]'::jsonb,
  add column if not exists status text default 'active';

alter table public.attempts
  add column if not exists confidence text,
  add column if not exists mistake_type text,
  add column if not exists understood_explanation boolean,
  add column if not exists review_later boolean not null default false;

alter table public.study_sessions alter column current_phase drop default;
alter table public.study_sessions alter column current_phase type text using current_phase::text;
update public.study_sessions set current_phase = 'mistakes' where current_phase = 'review';
drop type if exists public.session_phase;
alter table public.study_sessions alter column current_phase set default 'warmup';

grant update on table public.attempts to authenticated;

drop policy if exists "attempts_update_own" on public.attempts;
create policy "attempts_update_own" on public.attempts
  for update to authenticated
  using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- Intelligence: behavior + reading passages + formulas
alter table public.attempts
  add column if not exists retry_index integer not null default 0,
  add column if not exists used_simpler_explanation boolean not null default false,
  add column if not exists viewed_formula boolean not null default false,
  add column if not exists requested_similar boolean not null default false;

alter table public.questions
  add column if not exists question_text text,
  add column if not exists passage_text text,
  add column if not exists passage_difficulty integer,
  add column if not exists passage_tone text,
  add column if not exists passage_topic text,
  add column if not exists reading_skill text,
  add column if not exists passage_read_time_seconds integer,
  add column if not exists formula_latex text;

update public.questions set question_text = coalesce(question_text, prompt) where question_text is null;

-- Question Factory (see migrations/20250527120000_question_factory.sql)
alter table public.questions
  add column if not exists question_style text,
  add column if not exists common_mistake_explanation text,
  add column if not exists blueprint_hash text,
  add column if not exists content_hash text,
  add column if not exists parent_question_id uuid references public.questions (id) on delete set null,
  add column if not exists variation_type text default 'base',
  add column if not exists generated_by text default 'seed',
  add column if not exists validation_status text default 'approved';

create table if not exists public.question_blueprints (
  id uuid primary key default uuid_generate_v4(),
  blueprint_hash text not null unique,
  blueprint jsonb not null,
  base_question_id uuid references public.questions (id) on delete set null,
  status text not null default 'pending',
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on table public.question_blueprints to authenticated;
alter table public.question_blueprints enable row level security;
drop policy if exists "question_blueprints_select_authenticated" on public.question_blueprints;
create policy "question_blueprints_select_authenticated" on public.question_blueprints
  for select to authenticated using (true);

create table if not exists public.ai_content_cache (
  id uuid primary key default uuid_generate_v4(),
  cache_key text not null unique,
  content_type text not null check (content_type in ('tutoring_review', 'simpler_explanation', 'follow_up_questions')),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_content_cache_type_idx on public.ai_content_cache (content_type);

grant select, insert, update on table public.ai_content_cache to authenticated;
alter table public.ai_content_cache enable row level security;
drop policy if exists "ai_cache_read_all" on public.ai_content_cache;
create policy "ai_cache_read_all" on public.ai_content_cache for select to authenticated using (true);
drop policy if exists "ai_cache_write_all" on public.ai_content_cache;
create policy "ai_cache_write_all" on public.ai_content_cache for insert to authenticated with check (true);
drop policy if exists "ai_cache_update_all" on public.ai_content_cache;
create policy "ai_cache_update_all" on public.ai_content_cache for update to authenticated using (true) with check (true);

-- Mistake arena columns on attempts
alter table public.attempts
  add column if not exists mistake_recovered boolean not null default false,
  add column if not exists arena_completed boolean not null default false,
  add column if not exists parent_attempt_id uuid references public.attempts (id) on delete set null;
