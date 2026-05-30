-- Student path & tutoring-style onboarding fields

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

-- Allow students with no score yet
alter table public.profiles
  alter column current_score drop not null;

comment on column public.profiles.sat_experience is 'never | practice | official';
comment on column public.profiles.beginner_path is 'True when student has never taken the SAT';
