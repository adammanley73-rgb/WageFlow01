-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251122xxxxxx_payroll_runs_attach_trigger.sql
-- Trigger: whenever a new payroll_run row is inserted, automatically
--          attach all due employees based on company_id + frequency.

BEGIN;

CREATE OR REPLACE FUNCTION public.payroll_runs_after_insert_attach()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.attach_due_employees_to_run(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payroll_runs_after_insert_attach ON public.payroll_runs;

CREATE TRIGGER payroll_runs_after_insert_attach
AFTER INSERT ON public.payroll_runs
FOR EACH ROW
EXECUTE FUNCTION public.payroll_runs_after_insert_attach();

COMMIT;
