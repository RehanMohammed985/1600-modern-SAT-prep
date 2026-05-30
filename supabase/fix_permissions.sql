-- Run this in Supabase SQL Editor if you see "permission denied for table profiles"
-- (Required when schema was applied manually — grants are automatic on Supabase CLI deploys)

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update on table public.profiles to authenticated;
grant select on table public.profiles to anon;

grant select on table public.questions to authenticated;

grant select, insert, update on table public.study_sessions to authenticated;

grant select, insert on table public.attempts to authenticated;

-- Profile policies (idempotent)
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);
