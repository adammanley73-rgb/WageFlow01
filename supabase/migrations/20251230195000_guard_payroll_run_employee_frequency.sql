-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251230195000_guard_payroll_run_employee_frequency.sql
-- Purpose:
-- 1) Backfill payroll_run_employees.pay_frequency_used where it is NULL/blank.
-- 2) Prevent future NULL/blank pay_frequency_used on inserts (trigger).
-- 3) For draft runs with a valid frequency, remove mismatched attachments and re-attach correctly.
-- 4) Skip draft runs that have NULL/blank frequency (so db push cannot fail again).

BEGIN;

-- 1) Backfill pay_frequency_used from employees.pay_frequency first (best source),
--    then fallback to payroll_runs.frequency.
-- IMPORTANT: Do not reference the UPDATE target alias in a JOIN condition.
UPDATE public.payroll_run_employees AS pre
SET pay_frequency_used = COALESCE(
  NULLIF(BTRIM(pre.pay_frequency_used), ''),
  NULLIF(BTRIM(e.pay_frequency), ''),
  NULLIF(BTRIM(pr.frequency), '')
)
FROM public.employees AS e,
     public.payroll_runs AS pr
WHERE pre.employee_id = e.id
  AND pre.run_id = pr.id
  AND (pre.pay_frequency_used IS NULL OR BTRIM(pre.pay_frequency_used) = '');

-- 2) Any remaining NULL/blank rows: fallback to payroll_runs.frequency.
UPDATE public.payroll_run_employees AS pre
SET pay_frequency_used = NULLIF(BTRIM(pr.frequency), '')
FROM public.payroll_runs AS pr
WHERE pre.run_id = pr.id
  AND (pre.pay_frequency_used IS NULL OR BTRIM(pre.pay_frequency_used) = '')
  AND pr.frequency IS NOT NULL
  AND BTRIM(pr.frequency) <> '';

-- 3) Guard trigger: if pay_frequency_used is not provided, set it automatically.
CREATE OR REPLACE FUNCTION public.payroll_run_employees_set_pay_frequency_used()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_emp_freq text;
  v_run_freq text;
BEGIN
  IF NEW.pay_frequency_used IS NOT NULL AND BTRIM(NEW.pay_frequency_used) <> '' THEN
    RETURN NEW;
  END IF;

  SELECT e.pay_frequency
  INTO v_emp_freq
  FROM public.employees e
  WHERE e.id = NEW.employee_id;

  SELECT pr.frequency
  INTO v_run_freq
  FROM public.payroll_runs pr
  WHERE pr.id = NEW.run_id;

  NEW.pay_frequency_used := COALESCE(
    NULLIF(BTRIM(v_emp_freq), ''),
    NULLIF(BTRIM(v_run_freq), ''),
    NEW.pay_frequency_used
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payroll_run_employees_set_pay_frequency_used ON public.payroll_run_employees;

CREATE TRIGGER trg_payroll_run_employees_set_pay_frequency_used
BEFORE INSERT ON public.payroll_run_employees
FOR EACH ROW
EXECUTE FUNCTION public.payroll_run_employees_set_pay_frequency_used();

-- 4) Clean up draft runs: remove any attached rows that do not match the run frequency,
--    then re-attach due employees using the existing attach_due_employees_to_run function.
--    Skip runs with NULL/blank frequency, so this migration can never fail on them.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT pr.id AS run_id, pr.frequency
    FROM public.payroll_runs pr
    WHERE pr.status = 'draft'
      AND pr.company_id IS NOT NULL
      AND pr.frequency IS NOT NULL
      AND BTRIM(pr.frequency) <> ''
  LOOP
    DELETE FROM public.payroll_run_employees pre
    WHERE pre.run_id = r.run_id
      AND (
        pre.pay_frequency_used IS NULL
        OR BTRIM(pre.pay_frequency_used) = ''
        OR pre.pay_frequency_used <> r.frequency
      );

    UPDATE public.payroll_runs
    SET attached_all_due_employees = FALSE
    WHERE id = r.run_id;

    -- Call attach function if it exists (support uuid or text signature).
    IF to_regprocedure('public.attach_due_employees_to_run(uuid)') IS NOT NULL THEN
      PERFORM public.attach_due_employees_to_run(r.run_id);
    ELSIF to_regprocedure('public.attach_due_employees_to_run(text)') IS NOT NULL THEN
      PERFORM public.attach_due_employees_to_run(r.run_id::text);
    END IF;
  END LOOP;
END $$;

COMMIT;
