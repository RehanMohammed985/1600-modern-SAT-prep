-- Question Factory: blueprints, content hashing, variations, secure storage RPC
-- Safe to re-run.

alter table public.questions
  add column if not exists question_style text,
  add column if not exists common_mistake_explanation text,
  add column if not exists blueprint_hash text,
  add column if not exists content_hash text,
  add column if not exists parent_question_id uuid references public.questions (id) on delete set null,
  add column if not exists variation_type text default 'base'
    check (variation_type in ('base', 'easier', 'harder')),
  add column if not exists generated_by text default 'seed'
    check (generated_by in ('seed', 'factory', 'manual')),
  add column if not exists validation_status text default 'approved'
    check (validation_status in ('pending', 'approved', 'rejected'));

create index if not exists questions_blueprint_hash_idx on public.questions (blueprint_hash);
create index if not exists questions_content_hash_idx on public.questions (content_hash);
create index if not exists questions_skill_difficulty_idx on public.questions (skill_tag, difficulty, subskill);

create table if not exists public.question_blueprints (
  id uuid primary key default uuid_generate_v4(),
  blueprint_hash text not null unique,
  blueprint jsonb not null,
  base_question_id uuid references public.questions (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'generated', 'failed', 'reused')),
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists question_blueprints_status_idx on public.question_blueprints (status);

alter table public.question_blueprints enable row level security;

drop policy if exists "question_blueprints_select_authenticated" on public.question_blueprints;
create policy "question_blueprints_select_authenticated" on public.question_blueprints
  for select to authenticated using (true);

grant select on table public.question_blueprints to authenticated;

create or replace function public.store_factory_questions(
  blueprint_payload jsonb,
  questions_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q jsonb;
  base_id uuid;
  easier_id uuid;
  harder_id uuid;
  parent uuid;
  vtype text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if jsonb_typeof(questions_payload) <> 'array' or jsonb_array_length(questions_payload) < 1 then
    raise exception 'questions_payload must be a non-empty array';
  end if;

  base_id := null;
  easier_id := null;
  harder_id := null;

  for q in select * from jsonb_array_elements(questions_payload)
  loop
    vtype := coalesce(q->>'variation_type', 'base');

    insert into public.questions (
      prompt,
      question_text,
      choices,
      correct_answer,
      explanation,
      skill_tag,
      subskill,
      difficulty,
      estimated_seconds,
      section,
      test_type,
      concept_explanation,
      formula_or_rule,
      formula_latex,
      underlying_concept,
      common_mistakes,
      mistake_types,
      status,
      question_style,
      common_mistake_explanation,
      blueprint_hash,
      content_hash,
      parent_question_id,
      variation_type,
      generated_by,
      validation_status,
      passage_text,
      passage_topic,
      passage_tone,
      reading_skill,
      passage_read_time_seconds,
      passage_difficulty
    ) values (
      q->>'prompt',
      q->>'question_text',
      coalesce(q->'choices', '[]'::jsonb),
      q->>'correct_answer',
      q->>'explanation',
      q->>'skill_tag',
      q->>'subskill',
      (q->>'difficulty')::integer,
      coalesce((q->>'estimated_seconds')::integer, 90),
      q->>'section',
      coalesce(q->>'test_type', 'sat'),
      q->>'concept_explanation',
      q->>'formula_or_rule',
      q->>'formula_latex',
      q->>'underlying_concept',
      coalesce(q->'common_mistakes', '[]'::jsonb),
      coalesce(q->'mistake_types', '["concept_gap"]'::jsonb),
      coalesce(q->>'status', 'active'),
      q->>'question_style',
      q->>'common_mistake_explanation',
      q->>'blueprint_hash',
      q->>'content_hash',
      case when vtype = 'base' then null else base_id end,
      vtype,
      coalesce(q->>'generated_by', 'factory'),
      coalesce(q->>'validation_status', 'approved'),
      q->>'passage_text',
      q->>'passage_topic',
      q->>'passage_tone',
      q->>'reading_skill',
      nullif(q->>'passage_read_time_seconds', '')::integer,
      nullif(q->>'passage_difficulty', '')::integer
    )
    returning id into parent;

    if vtype = 'base' then
      base_id := parent;
    elsif vtype = 'easier' then
      easier_id := parent;
    elsif vtype = 'harder' then
      harder_id := parent;
    end if;
  end loop;

  if base_id is not null then
    update public.questions
    set parent_question_id = base_id
    where id in (easier_id, harder_id) and id <> base_id;
  end if;

  if blueprint_payload is not null then
    insert into public.question_blueprints (
      blueprint_hash,
      blueprint,
      base_question_id,
      status,
      updated_at
    ) values (
      blueprint_payload->>'blueprintHash',
      coalesce(blueprint_payload->'blueprint', '{}'::jsonb),
      base_id,
      'generated',
      now()
    )
    on conflict (blueprint_hash) do update set
      base_question_id = excluded.base_question_id,
      status = excluded.status,
      updated_at = now();
  end if;

  return jsonb_build_object(
    'baseQuestionId', base_id,
    'easierQuestionId', coalesce(easier_id, base_id),
    'harderQuestionId', coalesce(harder_id, base_id)
  );
end;
$$;

grant execute on function public.store_factory_questions(jsonb, jsonb) to authenticated;

drop policy if exists "question_blueprints_insert_authenticated" on public.question_blueprints;
create policy "question_blueprints_insert_authenticated" on public.question_blueprints
  for insert to authenticated with check (true);

drop policy if exists "question_blueprints_update_authenticated" on public.question_blueprints;
create policy "question_blueprints_update_authenticated" on public.question_blueprints
  for update to authenticated using (true) with check (true);

grant insert, update on table public.question_blueprints to authenticated;
