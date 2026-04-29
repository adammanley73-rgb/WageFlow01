UPDATE public.pay_element_types
SET
  is_salary_sacrifice_type = true,
  updated_at = NOW()
WHERE company_id IS NULL
  AND code = 'EE_PEN_SAL_SAC';

CREATE OR REPLACE FUNCTION public.attach_due_employees_to_run(p_run_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'wf_util'
AS $function$
DECLARE
  v_company_id uuid;
  v_frequency text;
  v_status text;
  v_workflow_status text;
  v_period_start date;
  v_period_end date;

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
    COALESCE(period_start, pay_period_start),
    COALESCE(period_end, pay_period_end)
  INTO
    v_company_id,
    v_frequency,
    v_status,
    v_workflow_status,
    v_period_start,
    v_period_end
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

  IF v_period_start IS NULL OR v_period_end IS NULL THEN
    RAISE EXCEPTION 'attach_due_employees_to_run: payroll_run % has no period_start/period_end', p_run_id;
  END IF;

  IF COALESCE(NULLIF(BTRIM(v_status), ''), 'draft') <> 'draft'
     OR COALESCE(NULLIF(BTRIM(v_workflow_status), ''), 'draft') <> 'draft' THEN
    RAISE EXCEPTION 'attach_due_employees_to_run: run % is not draft (status %, workflow_status %)', p_run_id, v_status, v_workflow_status;
  END IF;

  WITH eligible AS (
    SELECT
      e.id AS employee_id,
      ec.id AS contract_id,
      v_company_id AS company_id
    FROM public.employee_contracts ec
    JOIN public.employees e
      ON e.id = ec.employee_id
    WHERE
      e.company_id = v_company_id
      AND ec.company_id = v_company_id
      AND LOWER(COALESCE(ec.pay_frequency, '')) = LOWER(v_frequency)
      AND ec.start_date <= v_period_end
      AND (
        ec.leave_date IS NULL
        OR ec.leave_date >= v_period_start
        OR COALESCE(ec.pay_after_leaving, false) = true
      )
      AND (
        LOWER(COALESCE(e.status, '')) = 'active'
        OR (
          LOWER(COALESCE(e.status, '')) = 'leaver'
          AND COALESCE(e.pay_after_leaving, false) = true
          AND e.final_pay_date IS NOT NULL
          AND e.final_pay_date >= v_period_start
          AND e.final_pay_date <= v_period_end
        )
      )
      AND (
        LOWER(COALESCE(ec.status, '')) = 'active'
        OR (
          LOWER(COALESCE(ec.status, '')) = 'leaver'
          AND COALESCE(ec.pay_after_leaving, false) = true
        )
      )
  ),
  removed AS (
    DELETE FROM public.payroll_run_employees pre
    WHERE pre.run_id = p_run_id
      AND (
        pre.contract_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM eligible eg
          WHERE eg.contract_id = pre.contract_id
        )
      )
      AND COALESCE(pre.included_in_rti, false) = false
      AND NOT EXISTS (
        SELECT 1
        FROM public.payroll_run_pay_elements prpe
        WHERE prpe.payroll_run_employee_id = pre.id
      )
    RETURNING 1
  )
  SELECT COUNT(*)
  INTO v_removed
  FROM removed;

  WITH eligible AS (
    SELECT
      e.id AS employee_id,
      ec.id AS contract_id,
      v_company_id AS company_id,
      e.tax_code AS tax_code,
      e.tax_code_basis AS tax_code_basis,
      e.ni_category AS ni_category,
      e.student_loan AS student_loan,
      e.postgraduate_loan AS postgraduate_loan,
      ec.pay_frequency AS pay_frequency,
      ec.pay_basis AS pay_basis,
      ec.hours_per_week AS hours_per_week,
      ec.pay_after_leaving AS pay_after_leaving
    FROM public.employee_contracts ec
    JOIN public.employees e
      ON e.id = ec.employee_id
    WHERE
      e.company_id = v_company_id
      AND ec.company_id = v_company_id
      AND LOWER(COALESCE(ec.pay_frequency, '')) = LOWER(v_frequency)
      AND ec.start_date <= v_period_end
      AND (
        ec.leave_date IS NULL
        OR ec.leave_date >= v_period_start
        OR COALESCE(ec.pay_after_leaving, false) = true
      )
      AND (
        LOWER(COALESCE(e.status, '')) = 'active'
        OR (
          LOWER(COALESCE(e.status, '')) = 'leaver'
          AND COALESCE(e.pay_after_leaving, false) = true
          AND e.final_pay_date IS NOT NULL
          AND e.final_pay_date >= v_period_start
          AND e.final_pay_date <= v_period_end
        )
      )
      AND (
        LOWER(COALESCE(ec.status, '')) = 'active'
        OR (
          LOWER(COALESCE(ec.status, '')) = 'leaver'
          AND COALESCE(ec.pay_after_leaving, false) = true
        )
      )
  ),
  to_insert AS (
    SELECT
      p_run_id AS run_id,
      eg.employee_id AS employee_id,
      eg.contract_id AS contract_id,
      eg.company_id AS company_id,
      eg.tax_code AS tax_code_used,
      eg.tax_code_basis AS tax_code_basis_used,
      eg.ni_category AS ni_category_used,
      COALESCE(eg.student_loan, 'none') AS student_loan_used,
      COALESCE(eg.postgraduate_loan, false) AS pg_loan_used,
      COALESCE(eg.pay_frequency, v_frequency) AS pay_frequency_used,
      eg.pay_basis AS pay_basis_used,
      eg.hours_per_week AS hours_per_week_used,
      COALESCE(eg.pay_after_leaving, false) AS pay_after_leaving
    FROM eligible eg
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.payroll_run_employees pre
      WHERE pre.run_id = p_run_id
        AND pre.contract_id = eg.contract_id
    )
  ),
  inserted AS (
    INSERT INTO public.payroll_run_employees (
      run_id,
      employee_id,
      contract_id,
      company_id,
      tax_code_used,
      tax_code_basis_used,
      ni_category_used,
      student_loan_used,
      pg_loan_used,
      pay_frequency_used,
      pay_basis_used,
      hours_per_week_used,
      pay_after_leaving
    )
    SELECT
      run_id,
      employee_id,
      contract_id,
      company_id,
      tax_code_used,
      tax_code_basis_used,
      ni_category_used,
      student_loan_used,
      pg_loan_used,
      pay_frequency_used,
      pay_basis_used,
      hours_per_week_used,
      pay_after_leaving
    FROM to_insert
    RETURNING 1
  )
  SELECT COUNT(*)
  INTO v_inserted
  FROM inserted;

  WITH eligible AS (
    SELECT
      ec.id AS contract_id
    FROM public.employee_contracts ec
    JOIN public.employees e
      ON e.id = ec.employee_id
    WHERE
      e.company_id = v_company_id
      AND ec.company_id = v_company_id
      AND LOWER(COALESCE(ec.pay_frequency, '')) = LOWER(v_frequency)
      AND ec.start_date <= v_period_end
      AND (
        ec.leave_date IS NULL
        OR ec.leave_date >= v_period_start
        OR COALESCE(ec.pay_after_leaving, false) = true
      )
      AND (
        LOWER(COALESCE(e.status, '')) = 'active'
        OR (
          LOWER(COALESCE(e.status, '')) = 'leaver'
          AND COALESCE(e.pay_after_leaving, false) = true
          AND e.final_pay_date IS NOT NULL
          AND e.final_pay_date >= v_period_start
          AND e.final_pay_date <= v_period_end
        )
      )
      AND (
        LOWER(COALESCE(ec.status, '')) = 'active'
        OR (
          LOWER(COALESCE(ec.status, '')) = 'leaver'
          AND COALESCE(ec.pay_after_leaving, false) = true
        )
      )
  )
  SELECT
    COUNT(*),
    (
      SELECT COUNT(DISTINCT pre.contract_id)
      FROM public.payroll_run_employees pre
      WHERE pre.run_id = p_run_id
        AND pre.contract_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM eligible eg
          WHERE eg.contract_id = pre.contract_id
        )
    )
  INTO
    v_due_count,
    v_attached_count
  FROM eligible;

  UPDATE public.payroll_runs
  SET
    attached_all_due_employees = (COALESCE(v_due_count, 0) = COALESCE(v_attached_count, 0)),
    updated_at = NOW()
  WHERE id = p_run_id;

  RETURN COALESCE(v_inserted, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalc_payroll_run_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'wf_util'
AS $function$
DECLARE
  v_run uuid := COALESCE(NEW.run_id, OLD.run_id);
  v_company_id uuid;
  v_frequency text;
  v_status text;
  v_workflow_status text;
  v_period_start date;
  v_period_end date;

  v_due_count integer := 0;
  v_attached_count integer := 0;
BEGIN
  UPDATE public.payroll_runs pr
  SET
    total_gross_pay = (
      SELECT COALESCE(SUM(pre.gross_pay), 0)
      FROM public.payroll_run_employees pre
      WHERE pre.run_id = v_run
    ),
    total_tax = (
      SELECT COALESCE(SUM(COALESCE(pre.tax, 0)), 0)
      FROM public.payroll_run_employees pre
      WHERE pre.run_id = v_run
    ),
    total_ni = (
      SELECT COALESCE(SUM(COALESCE(pre.ni_employee, 0) + COALESCE(pre.ni_employer, 0)), 0)
      FROM public.payroll_run_employees pre
      WHERE pre.run_id = v_run
    ),
    total_net_pay = (
      SELECT COALESCE(SUM(pre.net_pay), 0)
      FROM public.payroll_run_employees pre
      WHERE pre.run_id = v_run
    ),
    updated_at = NOW()
  WHERE pr.id = v_run;

  SELECT
    pr.company_id,
    pr.frequency,
    pr.status,
    pr.workflow_status,
    COALESCE(pr.period_start, pr.pay_period_start),
    COALESCE(pr.period_end, pr.pay_period_end)
  INTO
    v_company_id,
    v_frequency,
    v_status,
    v_workflow_status,
    v_period_start,
    v_period_end
  FROM public.payroll_runs pr
  WHERE pr.id = v_run;

  IF v_company_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF COALESCE(NULLIF(BTRIM(v_status), ''), 'draft') <> 'draft'
     OR COALESCE(NULLIF(BTRIM(v_workflow_status), ''), 'draft') <> 'draft' THEN
    RETURN NULL;
  END IF;

  IF v_period_start IS NULL OR v_period_end IS NULL THEN
    RETURN NULL;
  END IF;

  WITH eligible AS (
    SELECT
      ec.id AS contract_id
    FROM public.employee_contracts ec
    JOIN public.employees e
      ON e.id = ec.employee_id
    WHERE
      e.company_id = v_company_id
      AND ec.company_id = v_company_id
      AND LOWER(COALESCE(ec.pay_frequency, '')) = LOWER(v_frequency)
      AND ec.start_date <= v_period_end
      AND (
        ec.leave_date IS NULL
        OR ec.leave_date >= v_period_start
        OR COALESCE(ec.pay_after_leaving, false) = true
      )
      AND (
        LOWER(COALESCE(e.status, '')) = 'active'
        OR (
          LOWER(COALESCE(e.status, '')) = 'leaver'
          AND COALESCE(e.pay_after_leaving, false) = true
          AND e.final_pay_date IS NOT NULL
          AND e.final_pay_date >= v_period_start
          AND e.final_pay_date <= v_period_end
        )
      )
      AND (
        LOWER(COALESCE(ec.status, '')) = 'active'
        OR (
          LOWER(COALESCE(ec.status, '')) = 'leaver'
          AND COALESCE(ec.pay_after_leaving, false) = true
        )
      )
  ),
  attached AS (
    SELECT DISTINCT
      pre.contract_id
    FROM public.payroll_run_employees pre
    WHERE pre.run_id = v_run
      AND pre.contract_id IS NOT NULL
  )
  SELECT
    (SELECT COUNT(*) FROM eligible),
    (
      SELECT COUNT(*)
      FROM attached a
      WHERE EXISTS (
        SELECT 1
        FROM eligible eg
        WHERE eg.contract_id = a.contract_id
      )
    )
  INTO
    v_due_count,
    v_attached_count;

  UPDATE public.payroll_runs
  SET
    attached_all_due_employees = (COALESCE(v_due_count, 0) = COALESCE(v_attached_count, 0)),
    updated_at = NOW()
  WHERE id = v_run;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.payroll_runs_after_insert_attach()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog, public, extensions, auth, wf_util'
AS $function$
BEGIN
  IF NEW.run_kind = 'supplementary' THEN
    RETURN NEW;
  END IF;

  PERFORM public.attach_due_employees_to_run(NEW.id);

  RETURN NEW;
END;
$function$;
