-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20260103221500_enterprise_schedule_truth_and_draft_autosync.sql

BEGIN;

-- 0) Hard guard: keep pay_schedules.frequency inside the allowed set
-- (you already got burned by "quarterly", so we stop that permanently).
UPDATE public.pay_schedules
SET frequency = 'weekly'
WHERE frequency NOT IN ('weekly','fortnightly','four_weekly','monthly')
  AND pay_day_of_week IS NOT NULL;

UPDATE public.pay_schedules
SET frequency = 'monthly'
WHERE frequency NOT IN ('weekly','fortnightly','four_weekly','monthly')
  AND pay_day_of_month IS NOT NULL;

UPDATE public.pay_schedules
SET frequency = 'monthly'
WHERE frequency NOT IN ('weekly','fortnightly','four_weekly','monthly');

ALTER TABLE public.pay_schedules
  DROP CONSTRAINT IF EXISTS pay_schedules_frequency_check;

ALTER TABLE public.pay_schedules
  ADD CONSTRAINT pay_schedules_frequency_check
  CHECK (frequency IN ('weekly','fortnightly','four_weekly','monthly'));

-- 1) Employees: make pay_schedule_id the truth.
-- If pay_schedule_id is set, force pay_frequency + frequency to match the schedule’s frequency.
CREATE OR REPLACE FUNCTION public.employees_sync_frequency_from_schedule()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_freq text;
BEGIN
  IF NEW.pay_schedule_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ps.frequency
  INTO v_freq
  FROM public.pay_schedules ps
  WHERE ps.id = NEW.pay_schedule_id;

  IF v_freq IS NULL OR BTRIM(v_freq) = '' THEN
    RAISE EXCEPTION 'employees_sync_frequency_from_schedule: pay_schedule % has no frequency', NEW.pay_schedule_id;
  END IF;

  NEW.pay_frequency := v_freq;
  NEW.frequency := v_freq;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_employees_sync_frequency_from_schedule ON public.employees;

-- Trigger fires if someone tries to edit any of these columns while pay_schedule_id is set.
CREATE TRIGGER trg_employees_sync_frequency_from_schedule
BEFORE INSERT OR UPDATE OF pay_schedule_id, pay_frequency, frequency ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.employees_sync_frequency_from_schedule();

-- Backfill existing employees so the DB becomes consistent immediately.
UPDATE public.employees e
SET
  pay_frequency = ps.frequency,
  frequency = ps.frequency
FROM public.pay_schedules ps
WHERE e.pay_schedule_id = ps.id
  AND (e.pay_frequency IS DISTINCT FROM ps.frequency OR e.frequency IS DISTINCT FROM ps.frequency);

-- 2) Payroll runs: add an optional pay_schedule_id so “multiple schedules per frequency” is real.
ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS pay_schedule_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'payroll_runs'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'payroll_runs_pay_schedule_id_fkey'
  ) THEN
    ALTER TABLE public.payroll_runs
      ADD CONSTRAINT payroll_runs_pay_schedule_id_fkey
      FOREIGN KEY (pay_schedule_id) REFERENCES public.pay_schedules(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payroll_runs_pay_schedule_id
  ON public.payroll_runs(pay_schedule_id);

-- Best-effort backfill for existing runs.
-- Uses a correlated subquery (no LATERAL) so Postgres stops complaining.
UPDATE public.payroll_runs pr
SET pay_schedule_id = (
  SELECT ps.id
  FROM public.pay_schedules ps
  WHERE ps.company_id = pr.company_id
    AND ps.is_active IS DISTINCT FROM FALSE
    AND ps.frequency = pr.frequency
    AND (
      (ps.frequency = 'monthly' AND (ps.pay_day_of_month IS NULL OR ps.pay_day_of_month = EXTRACT(DAY FROM pr.pay_date)::int))
      OR
      (ps.frequency = 'weekly' AND (
        ps.pay_day_of_week IS NULL
        OR ps.pay_day_of_week = EXTRACT(DOW FROM pr.pay_date)::int
        OR ps.pay_day_of_week = EXTRACT(ISODOW FROM pr.pay_date)::int
      ))
      OR
      (ps.frequency IN ('fortnightly','four_weekly'))
    )
  ORDER BY
    CASE
      WHEN ps.frequency = 'monthly' AND ps.pay_day_of_month = EXTRACT(DAY FROM pr.pay_date)::int THEN 0
      WHEN ps.frequency = 'weekly' AND (ps.pay_day_of_week = EXTRACT(DOW FROM pr.pay_date)::int OR ps.pay_day_of_week = EXTRACT(ISODOW FROM pr.pay_date)::int) THEN 0
      ELSE 1
    END,
    ps.created_at NULLS LAST
  LIMIT 1
)
WHERE pr.pay_schedule_id IS NULL
  AND pr.company_id IS NOT NULL;

-- 3) Helper: detect “run activity” for an employee across any tables that contain (run_id, employee_id).
CREATE OR REPLACE FUNCTION wf_util.employee_has_run_activity(p_run_id uuid, p_employee_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  r record;
  v_hit int;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_schema, table_name
    HAVING
      bool_or(column_name = 'run_id')
      AND bool_or(column_name = 'employee_id')
      AND table_name <> 'payroll_run_employees'
  LOOP
    BEGIN
      EXECUTE format(
        'select 1 from %I.%I where run_id = $1 and employee_id = $2 limit 1',
        r.table_schema,
        r.table_name
      )
      INTO v_hit
      USING p_run_id, p_employee_id;

      IF v_hit IS NOT NULL THEN
        RETURN TRUE;
      END IF;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN FALSE;
END;
$function$;

-- 4) Draft-only auto-sync: add missing, remove only if zero activity, schedule-driven when run.pay_schedule_id is set.
CREATE OR REPLACE FUNCTION public.attach_due_employees_to_run(p_run_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  v_company_id uuid;
  v_frequency text;
  v_status text;
  v_workflow_status text;
  v_pay_schedule_id uuid;
  v_inserted integer := 0;
  v_removed integer := 0;
  v_due_count integer := 0;
  v_attached_count integer := 0;
BEGIN
  SELECT
    company_id,
    frequency,
    status,
    workflow_status,
    pay_schedule_id
  INTO
    v_company_id,
    v_frequency,
    v_status,
    v_workflow_status,
    v_pay_schedule_id
  FROM public.payroll_runs
  WHERE id = p_run_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'attach_due_employees_to_run: payroll_run % not found', p_run_id;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'attach_due_employees_to_run: payroll_run % has no company_id', p_run_id;
  END IF;

  IF v_frequency IS NULL OR BTRIM(v_frequency) = '' THEN
    RAISE EXCEPTION 'attach_due_employees_to_run: payroll_run % has no frequency', p_run_id;
  END IF;

  IF COALESCE(NULLIF(BTRIM(v_status),''), 'draft') <> 'draft'
     OR COALESCE(NULLIF(BTRIM(v_workflow_status),''), 'draft') <> 'draft' THEN
    RAISE EXCEPTION 'attach_due_employees_to_run: run % is not draft (status %, workflow_status %)', p_run_id, v_status, v_workflow_status;
  END IF;

  WITH eligible AS (
    SELECT
      e.id AS employee_id,
      v_company_id AS company_id,
      e.tax_code AS tax_code,
      e.ni_category AS ni_category,
      e.student_loan AS student_loan,
      e.postgraduate_loan AS postgraduate_loan,
      e.pay_frequency AS pay_frequency,
      e.pay_basis AS pay_basis,
      e.hours_per_week AS hours_per_week
    FROM public.employees e
    WHERE
      e.company_id = v_company_id
      AND e.status = 'active'
      AND (
        (v_pay_schedule_id IS NOT NULL AND e.pay_schedule_id = v_pay_schedule_id)
        OR
        (v_pay_schedule_id IS NULL AND e.pay_frequency = v_frequency)
      )
  ),
  removed AS (
    DELETE FROM public.payroll_run_employees pre
    WHERE pre.run_id = p_run_id
      AND NOT EXISTS (SELECT 1 FROM eligible eg WHERE eg.employee_id = pre.employee_id)
      AND wf_util.employee_has_run_activity(p_run_id, pre.employee_id) = FALSE
    RETURNING 1
  ),
  to_insert AS (
    SELECT
      p_run_id AS run_id,
      eg.employee_id AS employee_id,
      eg.company_id AS company_id,
      eg.tax_code AS tax_code_used,
      eg.ni_category AS ni_category_used,
      COALESCE(eg.student_loan, 'none') AS student_loan_used,
      COALESCE(eg.postgraduate_loan, false) AS pg_loan_used,
      eg.pay_frequency AS pay_frequency_used,
      eg.pay_basis AS pay_basis_used,
      eg.hours_per_week AS hours_per_week_used
    FROM eligible eg
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.payroll_run_employees pre2
      WHERE pre2.run_id = p_run_id
        AND pre2.employee_id = eg.employee_id
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
  SELECT
    (SELECT COUNT(*) FROM inserted),
    (SELECT COUNT(*) FROM removed),
    (SELECT COUNT(*) FROM eligible),
    (SELECT COUNT(*) FROM public.payroll_run_employees pre3 WHERE pre3.run_id = p_run_id)
  INTO
    v_inserted,
    v_removed,
    v_due_count,
    v_attached_count;

  UPDATE public.payroll_runs
  SET attached_all_due_employees = (v_due_count = v_attached_count)
  WHERE id = p_run_id;

  RETURN COALESCE(v_inserted,0);
END;
$function$;

COMMIT;
