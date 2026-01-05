-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20260103213000_guard_payroll_run_employees_company_id.sql

BEGIN;

-- 1) Ensure payroll_run_employees.company_id cannot be NULL
ALTER TABLE public.payroll_run_employees
  ALTER COLUMN company_id SET NOT NULL;

-- 2) If any insert/update path forgets company_id, set it from the parent run.
CREATE OR REPLACE FUNCTION public.payroll_run_employees_set_company_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_run_company_id uuid;
BEGIN
  -- Only fill if missing. If wrong, wf_util.enforce_run_company_match should still throw.
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT pr.company_id
  INTO v_run_company_id
  FROM public.payroll_runs pr
  WHERE pr.id = NEW.run_id;

  IF v_run_company_id IS NULL THEN
    RAISE EXCEPTION 'payroll_run_employees_set_company_id: payroll_run % has no company_id', NEW.run_id;
  END IF;

  NEW.company_id := v_run_company_id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_00_payroll_run_employees_set_company_id ON public.payroll_run_employees;

-- Name sorts before trg_run_item_company_match so company_id is filled before enforcement runs.
CREATE TRIGGER trg_00_payroll_run_employees_set_company_id
BEFORE INSERT OR UPDATE ON public.payroll_run_employees
FOR EACH ROW
EXECUTE FUNCTION public.payroll_run_employees_set_company_id();

-- 3) Make attach_due_employees_to_run always insert company_id from the run (source of truth).
CREATE OR REPLACE FUNCTION public.attach_due_employees_to_run(p_run_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  v_company_id    uuid;
  v_frequency     text;
  v_status        text;
  v_inserted      integer;
BEGIN
  -- 1) Load the payroll run
  SELECT
    company_id,
    frequency,
    status
  INTO
    v_company_id,
    v_frequency,
    v_status
  FROM public.payroll_runs
  WHERE id = p_run_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'attach_due_employees_to_run: payroll_run % not found', p_run_id;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'attach_due_employees_to_run: payroll_run % has no company_id', p_run_id;
  END IF;

  IF v_frequency IS NULL THEN
    RAISE EXCEPTION 'attach_due_employees_to_run: payroll_run % has no frequency', p_run_id;
  END IF;

  -- 2) Insert missing snapshot rows for eligible employees
  WITH eligible AS (
    SELECT
      e.id                AS employee_id,
      e.tax_code          AS tax_code,
      e.ni_category       AS ni_category,
      e.student_loan      AS student_loan,
      e.postgraduate_loan AS postgraduate_loan,
      e.pay_frequency     AS pay_frequency,
      e.pay_basis         AS pay_basis,
      e.hours_per_week    AS hours_per_week
    FROM public.employees e
    WHERE
      e.company_id = v_company_id
      AND e.status = 'active'
      AND e.pay_frequency = v_frequency
  ),
  to_insert AS (
    SELECT
      p_run_id                             AS run_id,
      eg.employee_id                       AS employee_id,
      v_company_id                         AS company_id,
      eg.tax_code                          AS tax_code_used,
      eg.ni_category                       AS ni_category_used,
      COALESCE(eg.student_loan, 'none')    AS student_loan_used,
      COALESCE(eg.postgraduate_loan, false) AS pg_loan_used,
      eg.pay_frequency                     AS pay_frequency_used,
      eg.pay_basis                         AS pay_basis_used,
      eg.hours_per_week                    AS hours_per_week_used
    FROM eligible eg
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.payroll_run_employees pre
      WHERE pre.run_id = p_run_id
        AND pre.employee_id = eg.employee_id
    )
  ),
  inserted AS (
    INSERT INTO public.payroll_run_employees (
      run_id,
      employee_id,
      company_id,
      tax_code_used,
      ni_category_used,
      student_loan_used,
      pg_loan_used,
      pay_frequency_used,
      pay_basis_used,
      hours_per_week_used
    )
    SELECT
      run_id,
      employee_id,
      company_id,
      tax_code_used,
      ni_category_used,
      student_loan_used,
      pg_loan_used,
      pay_frequency_used,
      pay_basis_used,
      hours_per_week_used
    FROM to_insert
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted FROM inserted;

  -- 3) If we attached anyone, mark the run accordingly
  IF v_inserted > 0 THEN
    UPDATE public.payroll_runs
    SET attached_all_due_employees = TRUE
    WHERE id = p_run_id;
  END IF;

  RETURN COALESCE(v_inserted, 0);
END;
$function$;

COMMIT;
