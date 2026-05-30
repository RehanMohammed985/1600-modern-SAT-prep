-- Core learning loop: mistake arena tracking + AI content cache
-- Run in Supabase SQL editor (safe to re-run).

alter table public.attempts
  add column if not exists mistake_recovered boolean not null default false,
  add column if not exists arena_completed boolean not null default false,
  add column if not exists parent_attempt_id uuid references public.attempts (id) on delete set null;

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
create policy "ai_cache_read_all" on public.ai_content_cache
  for select to authenticated using (true);

drop policy if exists "ai_cache_write_all" on public.ai_content_cache;
create policy "ai_cache_write_all" on public.ai_content_cache
  for insert to authenticated with check (true);

drop policy if exists "ai_cache_update_all" on public.ai_content_cache;
create policy "ai_cache_update_all" on public.ai_content_cache
  for update to authenticated using (true) with check (true);
