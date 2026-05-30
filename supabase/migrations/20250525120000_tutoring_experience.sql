-- Guided tutoring experience: profiles, questions, attempts, session phases

-- Profiles
alter table public.profiles
  add column if not exists comfort_level text
    check (comfort_level in ('lost', 'basics', 'improving', 'unsure')),
  add column if not exists parent_email text,
  add column if not exists test_signup_status text
    check (test_signup_status in ('signed_up', 'not_signed_up', 'not_sure')),
  add column if not exists slow_mode boolean not null default false,
  add column if not exists grade_path_label text,
  add column if not exists planned_test_date date;

-- Questions (rich tutoring metadata)
alter table public.questions
  add column if not exists test_type text default 'sat'
    check (test_type in ('sat', 'act', 'both')),
  add column if not exists subskill text,
  add column if not exists concept_explanation text,
  add column if not exists formula_or_rule text,
  add column if not exists underlying_concept text,
  add column if not exists common_mistakes jsonb default '[]'::jsonb,
  add column if not exists mistake_types jsonb default '[]'::jsonb,
  add column if not exists status text default 'active'
    check (status in ('active', 'draft'));

-- Attempts (deeper tracking)
alter table public.attempts
  add column if not exists confidence text
    check (confidence in ('low', 'medium', 'high')),
  add column if not exists mistake_type text
    check (mistake_type in ('careless', 'concept_gap', 'timing', 'misread', 'vocabulary', 'setup_error')),
  add column if not exists understood_explanation boolean,
  add column if not exists review_later boolean not null default false;

-- Session phases: enum -> text for 6-step flow
alter table public.study_sessions
  alter column current_phase drop default;

alter table public.study_sessions
  alter column current_phase type text using current_phase::text;

update public.study_sessions set current_phase = 'mistakes' where current_phase = 'review';

drop type if exists public.session_phase;

alter table public.study_sessions
  alter column current_phase set default 'warmup';

alter table public.study_sessions
  add constraint study_sessions_phase_check check (
    current_phase in ('warmup', 'focus', 'timed', 'mixed', 'mistakes', 'takeaway', 'complete')
  );
