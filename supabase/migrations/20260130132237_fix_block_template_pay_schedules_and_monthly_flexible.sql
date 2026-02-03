-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20260130132237_fix_block_template_pay_schedules_and_monthly_flexible.sql
-- Purpose:
-- 1) Prevent payroll_runs.pay_schedule_id from ever pointing at a template pay_schedules row.
-- 2) Ensure Monthly - Flexible (44444444...) is treated as a real schedule (is_template=false).
--
-- Notes:
-- - Weekly drift data correction (moving 51 runs from 5555... to 1111...) was performed directly in Supabase.
--   This migration enforces the rule going forward.

BEGIN;

CREATE OR REPLACE FUNCTION public.block_template_pay_schedules_on_runs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  is_t boolean;
BEGIN
  IF NEW.pay_schedule_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ps.is_template
  INTO is_t
  FROM public.pay_schedules ps
  WHERE ps.id = NEW.pay_schedule_id;

  IF is_t IS NULL THEN
    RAISE EXCEPTION 'payroll_runs.pay_schedule_id (%) does not exist in pay_schedules', NEW.pay_schedule_id;
  END IF;

  IF is_t IS TRUE THEN
    RAISE EXCEPTION 'payroll_runs.pay_schedule_id (%) points to a template pay_schedule, which is not allowed', NEW.pay_schedule_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_template_pay_schedules_on_runs ON public.payroll_runs;

CREATE TRIGGER trg_block_template_pay_schedules_on_runs
BEFORE INSERT OR UPDATE OF pay_schedule_id ON public.payroll_runs
FOR EACH ROW
EXECUTE FUNCTION public.block_template_pay_schedules_on_runs();

UPDATE public.pay_schedules
SET is_template = FALSE
WHERE id = '44444444-4444-4444-4444-444444444444'::uuid;

COMMIT;
