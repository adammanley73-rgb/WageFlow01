-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251210_add_gender_and_apprentice_fields.sql

-- Add gender field to employees
-- Allowed values: 'male', 'female', 'unknown'
alter table public.employees
  add column if not exists gender text not null default 'unknown';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_gender_valid'
  ) then
    alter table public.employees
      add constraint employees_gender_valid
      check (gender in ('male', 'female', 'unknown'));
  end if;
end $$;

-- Add apprentice flags for later NMW and NI logic

-- Marks the employee as an apprentice
alter table public.employees
  add column if not exists is_apprentice boolean not null default false;

-- Optional year of apprenticeship (1, 2, 3, 4, etc)
alter table public.employees
  add column if not exists apprentice_year integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_apprentice_year_valid'
  ) then
    alter table public.employees
      add constraint employees_apprentice_year_valid
      check (
        apprentice_year is null
        or apprentice_year between 1 and 5
      );
  end if;
end $$;
