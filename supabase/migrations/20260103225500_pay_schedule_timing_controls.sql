-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20260103225500_pay_schedule_timing_controls.sql
-- Defensive: only runs if pay_schedules table exists

BEGIN;

DO $$
BEGIN
  -- Check if pay_schedules table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pay_schedules'
  ) THEN
    RAISE NOTICE 'pay_schedules table does not exist, skipping timing controls migration';
    RETURN;
  END IF;

  -- 1) Add enterprise timing controls to pay_schedules
  ALTER TABLE public.pay_schedules
    ADD COLUMN IF NOT EXISTS is_flexible boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS pay_timing text NOT NULL DEFAULT 'arrears',
    ADD COLUMN IF NOT EXISTS cycle_anchor_pay_date date NULL,
    ADD COLUMN IF NOT EXISTS pay_date_adjustment text NOT NULL DEFAULT 'previous_working_day',
    ADD COLUMN IF NOT EXISTS pay_date_offset_days integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_advance_days integer NOT NULL DEFAULT 7,
    ADD COLUMN IF NOT EXISTS max_lag_days integer NOT NULL DEFAULT 7;

  -- 2) Constrain values (enterprise-grade, boring, reliable)
  ALTER TABLE public.pay_schedules
    DROP CONSTRAINT IF EXISTS pay_schedules_pay_timing_check;

  ALTER TABLE public.pay_schedules
    ADD CONSTRAINT pay_schedules_pay_timing_check
    CHECK (pay_timing IN ('arrears','current','advance','flexible'));

  ALTER TABLE public.pay_schedules
    DROP CONSTRAINT IF EXISTS pay_schedules_pay_date_adjustment_check;

  ALTER TABLE public.pay_schedules
    ADD CONSTRAINT pay_schedules_pay_date_adjustment_check
    CHECK (pay_date_adjustment IN ('previous_working_day','next_working_day','none'));

  ALTER TABLE public.pay_schedules
    DROP CONSTRAINT IF EXISTS pay_schedules_lag_windows_check;

  ALTER TABLE public.pay_schedules
    ADD CONSTRAINT pay_schedules_lag_windows_check
    CHECK (max_advance_days >= 0 AND max_lag_days >= 0);

  -- 3) Backfill sensible defaults from existing naming
  UPDATE public.pay_schedules
  SET
    is_flexible = true,
    pay_timing = 'flexible'
  WHERE name ILIKE '%flexible%';

  -- 4) Fortnightly/four-weekly need an anchor date to be deterministic.
  -- Use the first ever pay_date on that schedule as the anchor where available.
  UPDATE public.pay_schedules ps
  SET cycle_anchor_pay_date = sub.first_pay_date
  FROM (
    SELECT
      pay_schedule_id,
      MIN(pay_date) AS first_pay_date
    FROM public.payroll_runs
    WHERE pay_schedule_id IS NOT NULL
    GROUP BY pay_schedule_id
  ) sub
  WHERE ps.id = sub.pay_schedule_id
    AND ps.cycle_anchor_pay_date IS NULL
    AND ps.frequency IN ('fortnightly','four_weekly')
    AND ps.is_flexible = false;

  -- Add the anchor requirement, but NOT VALID so it won't block if a schedule has no runs yet
  ALTER TABLE public.pay_schedules
    DROP CONSTRAINT IF EXISTS pay_schedules_cycle_anchor_required_check;

  ALTER TABLE public.pay_schedules
    ADD CONSTRAINT pay_schedules_cycle_anchor_required_check
    CHECK (
      is_flexible = true
      OR frequency NOT IN ('fortnightly','four_weekly')
      OR cycle_anchor_pay_date IS NOT NULL
    )
    NOT VALID;
END $$;

COMMIT;
