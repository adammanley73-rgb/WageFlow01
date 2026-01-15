-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\YYYYMMDDHHMMSS_add_employee_validation_constraints.sql
-- Guardrails: NI format + pay_frequency allowed values.
-- This prevents UI/API bypasses from inserting bad data.
-- Defensive: handles different column name variations

begin;

-- 1) Normalise existing data so the constraints can be added safely.

DO $$
BEGIN
  -- Normalise NI columns: uppercase, remove spaces, strip non-alphanumerics.
  -- Handle ni_number if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'ni_number'
  ) THEN
    UPDATE public.employees
    SET ni_number = regexp_replace(regexp_replace(upper(ni_number), '\s+', '', 'g'), '[^A-Z0-9]', '', 'g')
    WHERE ni_number IS NOT NULL;

    -- If anything still doesn't match the format, null it out (better than blocking migrations).
    UPDATE public.employees
    SET ni_number = NULL
    WHERE ni_number IS NOT NULL
      AND ni_number !~ '^[A-Z]{2}[0-9]{6}[A-Z]$';
  END IF;

  -- Handle national_insurance_number if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'national_insurance_number'
  ) THEN
    UPDATE public.employees
    SET national_insurance_number = regexp_replace(regexp_replace(upper(national_insurance_number), '\s+', '', 'g'), '[^A-Z0-9]', '', 'g')
    WHERE national_insurance_number IS NOT NULL;

    UPDATE public.employees
    SET national_insurance_number = NULL
    WHERE national_insurance_number IS NOT NULL
      AND national_insurance_number !~ '^[A-Z]{2}[0-9]{6}[A-Z]$';
  END IF;

  -- Normalise pay_frequency to expected values.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'pay_frequency'
  ) THEN
    UPDATE public.employees
    SET pay_frequency = lower(trim(pay_frequency))
    WHERE pay_frequency IS NOT NULL;

    UPDATE public.employees
    SET pay_frequency = 'four_weekly'
    WHERE pay_frequency IN ('four-weekly', 'four weekly', '4weekly', '4-weekly', '4 weekly');

    UPDATE public.employees
    SET pay_frequency = 'fortnightly'
    WHERE pay_frequency IN ('fortnight', 'two weekly', 'two-weekly', 'biweekly', 'bi-weekly');

    -- Null any remaining invalid values so the constraint can be applied.
    UPDATE public.employees
    SET pay_frequency = NULL
    WHERE pay_frequency IS NOT NULL
      AND pay_frequency NOT IN ('weekly', 'fortnightly', 'four_weekly', 'monthly');
  END IF;
END $$;

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

-- 3) Add constraints (null allowed) only if columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'ni_number'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_ni_number_format_chk
      CHECK (ni_number IS NULL OR ni_number ~ '^[A-Z]{2}[0-9]{6}[A-Z]$');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'national_insurance_number'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_national_insurance_number_format_chk
      CHECK (national_insurance_number IS NULL OR national_insurance_number ~ '^[A-Z]{2}[0-9]{6}[A-Z]$');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'pay_frequency'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_pay_frequency_valid_chk
      CHECK (pay_frequency IS NULL OR pay_frequency IN ('weekly', 'fortnightly', 'four_weekly', 'monthly'));
  END IF;
END $$;

commit;
