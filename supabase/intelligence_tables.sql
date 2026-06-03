-- Intelligence system tables (run after complete_setup.sql)

-- Ensure uuid extension is available
create extension if not exists "pgcrypto";

-- Question statistics for IRT (discrimination, difficulty parameters)
create table if not exists public.question_stats (
  question_id uuid primary key references public.questions (id) on delete cascade,
  total_attempts integer not null default 0,
  correct_count integer not null default 0,
  accuracy real not null default 0,
  avg_time_seconds real not null default 0,
  discrimination real not null default 0.5,
  difficulty_param real not null default 0,
  guessing_param real not null default 0.25,
  last_updated timestamptz not null default now()
);

grant select, insert, update on table public.question_stats to authenticated;
alter table public.question_stats enable row level security;
create policy "question_stats_read_all" on public.question_stats for select to authenticated using (true);
create policy "question_stats_write_all" on public.question_stats for insert to authenticated with check (true);
create policy "question_stats_update_all" on public.question_stats for update to authenticated using (true) with check (true);

-- BKT skill states per student
create table if not exists public.skill_states (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  skill_tag text not null,
  p_mastered real not null default 0.2,
  p_learn real not null default 0.15,
  p_guess real not null default 0.15,
  p_slip real not null default 0.1,
  opportunities integer not null default 0,
  consecutive_correct integer not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, skill_tag)
);

create index if not exists skill_states_student_idx on public.skill_states (student_id);

grant select, insert, update on table public.skill_states to authenticated;
alter table public.skill_states enable row level security;
create policy "skill_states_select_own" on public.skill_states for select using (auth.uid() = student_id);
create policy "skill_states_insert_own" on public.skill_states for insert with check (auth.uid() = student_id);
create policy "skill_states_update_own" on public.skill_states for update using (auth.uid() = student_id);

-- Spaced repetition review cards
create table if not exists public.review_cards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  skill_tag text not null,
  ease_factor real not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  last_review_at timestamptz,
  next_review_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, skill_tag)
);

create index if not exists review_cards_next_review_idx on public.review_cards (student_id, next_review_at);

grant select, insert, update on table public.review_cards to authenticated;
alter table public.review_cards enable row level security;
create policy "review_cards_select_own" on public.review_cards for select using (auth.uid() = student_id);
create policy "review_cards_insert_own" on public.review_cards for insert with check (auth.uid() = student_id);
create policy "review_cards_update_own" on public.review_cards for update using (auth.uid() = student_id);

-- Mistake patterns per student
create table if not exists public.mistake_patterns (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  skill_tag text not null,
  mistake_type text not null,
  count integer not null default 0,
  last_occurrence_at timestamptz,
  recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, skill_tag, mistake_type)
);

create index if not exists mistake_patterns_student_idx on public.mistake_patterns (student_id);

grant select, insert, update on table public.mistake_patterns to authenticated;
alter table public.mistake_patterns enable row level security;
create policy "mistake_patterns_select_own" on public.mistake_patterns for select using (auth.uid() = student_id);
create policy "mistake_patterns_insert_own" on public.mistake_patterns for insert with check (auth.uid() = student_id);
create policy "mistake_patterns_update_own" on public.mistake_patterns for update using (auth.uid() = student_id);

-- Weekly study plans
create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  plan jsonb not null default '{}'::jsonb,
  predicted_score_before integer,
  predicted_score_after integer,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_id, week_start)
);

grant select, insert, update on table public.study_plans to authenticated;
alter table public.study_plans enable row level security;
create policy "study_plans_select_own" on public.study_plans for select using (auth.uid() = student_id);
create policy "study_plans_insert_own" on public.study_plans for insert with check (auth.uid() = student_id);
create policy "study_plans_update_own" on public.study_plans for update using (auth.uid() = student_id);

-- Score predictions history
create table if not exists public.score_predictions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  predicted_score integer not null,
  predicted_math integer not null,
  predicted_reading_writing integer not null,
  confidence real not null default 0.5,
  prediction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists score_predictions_student_idx on public.score_predictions (student_id, prediction_date desc);

grant select, insert on table public.score_predictions to authenticated;
alter table public.score_predictions enable row level security;
create policy "score_predictions_select_own" on public.score_predictions for select using (auth.uid() = student_id);
create policy "score_predictions_insert_own" on public.score_predictions for insert with check (auth.uid() = student_id);

-- SAT question taxonomy: domain/subskill hierarchy
create table if not exists public.sat_taxonomy (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  subskill text not null,
  description text,
  difficulty_range int4range,
  unique (domain, subskill)
);

grant select on table public.sat_taxonomy to authenticated;
alter table public.sat_taxonomy enable row level security;
create policy "sat_taxonomy_read_all" on public.sat_taxonomy for select to authenticated using (true);

-- Insert standard SAT taxonomy
insert into public.sat_taxonomy (domain, subskill, description, difficulty_range) values
  ('math-heart-algebra', 'linear-equations', 'Solving linear equations and systems', '[1,3]'::int4range),
  ('math-heart-algebra', 'linear-inequalities', 'Solving linear inequalities', '[1,3]'::int4range),
  ('math-heart-algebra', 'linear-functions', 'Interpreting linear functions', '[2,4]'::int4range),
  ('math-problem-solving', 'ratios-proportions', 'Ratios, rates, proportions', '[1,3]'::int4range),
  ('math-problem-solving', 'percentages', 'Percentages and percent change', '[1,3]'::int4range),
  ('math-problem-solving', 'data-analysis', 'Tables, graphs, data trends', '[2,4]'::int4range),
  ('math-problem-solving', 'probability', 'Basic probability', '[1,3]'::int4range),
  ('math-advanced', 'quadratics', 'Quadratic equations and graphs', '[3,5]'::int4range),
  ('math-advanced', 'exponentials', 'Exponential functions', '[3,5]'::int4range),
  ('math-advanced', 'polynomials', 'Polynomial operations and factoring', '[3,5]'::int4range),
  ('math-additional', 'geometry', 'Coordinate and plane geometry', '[2,4]'::int4range),
  ('math-additional', 'trigonometry', 'Basic trig ratios and circles', '[3,5]'::int4range),
  ('math-additional', 'complex-numbers', 'Complex number operations', '[3,5]'::int4range),
  ('reading-information', 'main-idea', 'Identify central themes', '[1,3]'::int4range),
  ('reading-information', 'supporting-detail', 'Locate specific evidence', '[1,3]'::int4range),
  ('reading-information', 'inference', 'Draw reasonable conclusions', '[2,4]'::int4range),
  ('reading-rhetoric', 'word-context', 'Vocabulary in context', '[1,3]'::int4range),
  ('reading-rhetoric', 'text-structure', 'Analyze text organization', '[2,4]'::int4range),
  ('reading-rhetoric', 'purpose', 'Author purpose and perspective', '[2,4]'::int4range),
  ('reading-synthesis', 'paired-passages', 'Analyze multiple texts', '[3,5]'::int4range),
  ('reading-synthesis', 'data-claims', 'Evaluate claims with data', '[3,5]'::int4range),
  ('writing-expression', 'organization', 'Paragraph and essay structure', '[2,4]'::int4range),
  ('writing-expression', 'transitions', 'Transition words and logic', '[2,4]'::int4range),
  ('writing-conventions', 'grammar', 'Subject-verb agreement, tenses', '[1,3]'::int4range),
  ('writing-conventions', 'punctuation', 'Commas, semicolons, colons', '[1,3]'::int4range),
  ('writing-conventions', 'sentence-structure', 'Fragments, run-ons, modifiers', '[2,4]'::int4range)
  on conflict (domain, subskill) do nothing;

-- Seed question_stats for existing questions
insert into public.question_stats (question_id, total_attempts, correct_count, accuracy, avg_time_seconds, discrimination, difficulty_param, guessing_param)
select id, 0, 0, 0, estimated_seconds, 0.5, 0, 0.25
from public.questions
on conflict (question_id) do nothing;
