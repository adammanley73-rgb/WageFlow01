-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\YYYYMMDDHHMMSS_add_employee_validation_constraints.sql
-- Guardrails: NI format + pay_frequency allowed values.
-- This prevents UI/API bypasses from inserting bad data.

begin;

-- 1) Normalise existing data so the constraints can be added safely.

-- Normalise NI columns: uppercase, remove spaces, strip non-alphanumerics.
update public.employees
set ni_number = regexp_replace(regexp_replace(upper(ni_number), '\s+', '', 'g'), '[^A-Z0-9]', '', 'g')
where ni_number is not null;

update public.employees
set national_insurance_number = regexp_replace(regexp_replace(upper(national_insurance_number), '\s+', '', 'g'), '[^A-Z0-9]', '', 'g')
where national_insurance_number is not null;

-- If anything still doesn't match the format, null it out (better than blocking migrations).
update public.employees
set ni_number = null
where ni_number is not null
  and ni_number !~ '^[A-Z]{2}[0-9]{6}[A-Z]$';

update public.employees
set national_insurance_number = null
where national_insurance_number is not null
  and national_insurance_number !~ '^[A-Z]{2}[0-9]{6}[A-Z]$';

-- Normalise pay_frequency to expected values.
update public.employees
set pay_frequency = lower(trim(pay_frequency))
where pay_frequency is not null;

update public.employees
set pay_frequency = 'four_weekly'
where pay_frequency in ('four-weekly', 'four weekly', '4weekly', '4-weekly', '4 weekly');

update public.employees
set pay_frequency = 'fortnightly'
where pay_frequency in ('fortnight', 'two weekly', 'two-weekly', 'biweekly', 'bi-weekly');

-- Null any remaining invalid values so the constraint can be applied.
update public.employees
set pay_frequency = null
where pay_frequency is not null
  and pay_frequency not in ('weekly', 'fortnightly', 'four_weekly', 'monthly');

-- 2) Drop old constraints if they exist (safe re-run).
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'employees_ni_number_format_chk') then
    alter table public.employees drop constraint employees_ni_number_format_chk;
  end if;

  if exists (select 1 from pg_constraint where conname = 'employees_national_insurance_number_format_chk') then
    alter table public.employees drop constraint employees_national_insurance_number_format_chk;
  end if;

  if exists (select 1 from pg_constraint where conname = 'employees_pay_frequency_valid_chk') then
    alter table public.employees drop constraint employees_pay_frequency_valid_chk;
  end if;
end $$;

-- 3) Add constraints (null allowed).
alter table public.employees
  add constraint employees_ni_number_format_chk
  check (ni_number is null or ni_number ~ '^[A-Z]{2}[0-9]{6}[A-Z]$');

alter table public.employees
  add constraint employees_national_insurance_number_format_chk
  check (national_insurance_number is null or national_insurance_number ~ '^[A-Z]{2}[0-9]{6}[A-Z]$');

alter table public.employees
  add constraint employees_pay_frequency_valid_chk
  check (pay_frequency is null or pay_frequency in ('weekly', 'fortnightly', 'four_weekly', 'monthly'));

commit;
