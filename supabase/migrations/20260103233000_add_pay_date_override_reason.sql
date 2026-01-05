-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20260103233000_add_pay_date_override_reason.sql

BEGIN;

ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS pay_date_override_reason text;

COMMIT;
