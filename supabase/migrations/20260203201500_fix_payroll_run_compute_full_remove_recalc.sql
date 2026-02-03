-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20260203201500_fix_payroll_run_compute_full_remove_recalc.sql
-- Fix: payroll_run_compute_full must not call recalc_payroll_run_totals(uuid) because it does not exist.
-- The API route already refreshes run totals after compute.

BEGIN;

CREATE OR REPLACE FUNCTION public.payroll_run_compute_full(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_run_exists boolean;
  v_updated int := 0;

  r_pre record;

  v_earnings numeric := 0;
  v_deductions numeric := 0;
  v_tax numeric := 0;
  v_ni_employee numeric := 0;
  v_ni_employer numeric := 0;

  v_basic numeric := 0;
  v_overtime numeric := 0;
  v_bonus numeric := 0;
  v_other_earnings numeric := 0;
  v_other_deductions numeric := 0;

  v_taxable_pay numeric := 0;

  v_gross numeric := 0;
  v_net numeric := 0;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.payroll_runs pr
    WHERE pr.id = p_run_id
  )
  INTO v_run_exists;

  IF NOT v_run_exists THEN
    RAISE EXCEPTION 'payroll_run_compute_full: run not found: %', p_run_id;
  END IF;

  FOR r_pre IN
    SELECT
      pre.id AS payroll_run_employee_id,
      pre.employee_id
    FROM public.payroll_run_employees pre
    WHERE pre.run_id = p_run_id
  LOOP
    v_earnings := 0;
    v_deductions := 0;
    v_tax := 0;
    v_ni_employee := 0;
    v_ni_employer := 0;

    v_basic := 0;
    v_overtime := 0;
    v_bonus := 0;
    v_other_earnings := 0;
    v_other_deductions := 0;

    v_taxable_pay := 0;

    SELECT
      COALESCE(SUM(
        CASE
          WHEN COALESCE(pet.side,'earning') <> 'deduction' AND pe.amount > 0 THEN pe.amount
          ELSE 0
        END
      ),0) AS earnings_sum,

      COALESCE(SUM(
        CASE
          WHEN COALESCE(pet.side,'earning') = 'deduction' THEN ABS(pe.amount)
          WHEN COALESCE(pet.side,'earning') <> 'deduction' AND pe.amount < 0 THEN ABS(pe.amount)
          ELSE 0
        END
      ),0) AS deductions_sum,

      COALESCE(SUM(
        CASE
          WHEN UPPER(COALESCE(pet.code,'')) IN ('PAYE','PAYE_TAX','TAX','INCOME_TAX') THEN ABS(pe.amount)
          ELSE 0
        END
      ),0) AS tax_sum,

      COALESCE(SUM(
        CASE
          WHEN UPPER(COALESCE(pet.code,'')) IN ('NI','EE_NI','EMP_NI','NI_EMPLOYEE') THEN ABS(pe.amount)
          ELSE 0
        END
      ),0) AS ni_employee_sum,

      COALESCE(SUM(
        CASE
          WHEN UPPER(COALESCE(pet.code,'')) IN ('NI_ER','ER_NI','NI_EMPLOYER') THEN ABS(pe.amount)
          ELSE 0
        END
      ),0) AS ni_employer_sum,

      COALESCE(SUM(
        CASE
          WHEN COALESCE(pet.side,'earning') <> 'deduction'
               AND UPPER(COALESCE(pet.code,'')) IN ('BASIC')
               AND pe.amount > 0
          THEN pe.amount
          ELSE 0
        END
      ),0) AS basic_sum,

      COALESCE(SUM(
        CASE
          WHEN COALESCE(pet.side,'earning') <> 'deduction'
               AND UPPER(COALESCE(pet.code,'')) IN ('OVERTIME','OT')
               AND pe.amount > 0
          THEN pe.amount
          ELSE 0
        END
      ),0) AS overtime_sum,

      COALESCE(SUM(
        CASE
          WHEN COALESCE(pet.side,'earning') <> 'deduction'
               AND UPPER(COALESCE(pet.code,'')) IN ('BONUS')
               AND pe.amount > 0
          THEN pe.amount
          ELSE 0
        END
      ),0) AS bonus_sum,

      COALESCE(SUM(
        CASE
          WHEN COALESCE(pet.side,'earning') <> 'deduction'
               AND pe.amount > 0
               AND UPPER(COALESCE(pet.code,'')) NOT IN ('BASIC','OVERTIME','OT','BONUS')
          THEN pe.amount
          ELSE 0
        END
      ),0) AS other_earnings_sum,

      COALESCE(SUM(
        CASE
          WHEN COALESCE(pet.side,'earning') = 'deduction'
               AND UPPER(COALESCE(pet.code,'')) NOT IN ('PAYE','PAYE_TAX','TAX','INCOME_TAX','NI','EE_NI','EMP_NI','NI_EMPLOYEE','NI_ER','ER_NI','NI_EMPLOYER')
          THEN ABS(pe.amount)
          ELSE 0
        END
      ),0) AS other_deductions_sum,

      COALESCE(SUM(
        CASE
          WHEN COALESCE(pet.side,'earning') <> 'deduction'
               AND pe.amount > 0
               AND COALESCE(pe.taxable_for_paye_override, pet.taxable_for_paye, FALSE) = TRUE
          THEN pe.amount
          ELSE 0
        END
      ),0) AS taxable_pay_sum
    INTO
      v_earnings,
      v_deductions,
      v_tax,
      v_ni_employee,
      v_ni_employer,
      v_basic,
      v_overtime,
      v_bonus,
      v_other_earnings,
      v_other_deductions,
      v_taxable_pay
    FROM public.payroll_run_pay_elements pe
    LEFT JOIN public.pay_element_types pet
      ON pet.id = pe.pay_element_type_id
    WHERE pe.payroll_run_employee_id = r_pre.payroll_run_employee_id;

    v_gross := v_earnings;
    v_net := v_earnings - v_deductions;

    UPDATE public.payroll_run_employees
    SET
      gross_pay = v_gross,
      net_pay = v_net,
      tax = v_tax,
      ni_employee = v_ni_employee,
      ni_employer = v_ni_employer,
      employee_ni = v_ni_employee,
      employer_ni = v_ni_employer,
      basic_pay = v_basic,
      overtime_pay = v_overtime,
      bonus_pay = v_bonus,
      other_earnings = v_other_earnings,
      other_deductions = v_other_deductions,
      taxable_pay = v_taxable_pay,
      calc_mode = 'full'
    WHERE run_id = p_run_id
      AND employee_id = r_pre.employee_id;

    v_updated := v_updated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'run_id', p_run_id,
    'employees_updated', v_updated
  );
END;
$function$;

COMMIT;
