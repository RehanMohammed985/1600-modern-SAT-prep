-- Intelligence: behavior tracking + reading passages + formula blocks

alter table public.attempts
  add column if not exists retry_index integer not null default 0,
  add column if not exists used_simpler_explanation boolean not null default false,
  add column if not exists viewed_formula boolean not null default false,
  add column if not exists requested_similar boolean not null default false;

alter table public.questions
  add column if not exists question_text text,
  add column if not exists passage_text text,
  add column if not exists passage_difficulty integer check (passage_difficulty between 1 and 5),
  add column if not exists passage_tone text,
  add column if not exists passage_topic text,
  add column if not exists reading_skill text,
  add column if not exists passage_read_time_seconds integer,
  add column if not exists formula_latex text;

update public.questions
set question_text = coalesce(question_text, prompt)
where question_text is null;
