CREATE OR REPLACE FUNCTION public.wf_seed_prep_defaults(p_prep_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_basis text;
  v_freq text;
  v_hours numeric;
  v_annual numeric;
  v_hourly numeric;
  v_emp_status text;
  v_contract_status text;

  v_manual boolean;
  v_pay_after_leaving boolean;
  v_included_in_rti boolean;

  v_basic numeric;
  v_gross numeric;
  v_overtime numeric;
  v_bonus numeric;
  v_other_earnings numeric;

  v_has_manual_override boolean;
  v_basic_element_type_id uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payroll_run_employees'
      AND column_name = 'manual_override'
  )
  INTO v_has_manual_override;

  IF v_has_manual_override THEN
    SELECT
      pre.company_id,
      COALESCE(NULLIF(pre.pay_basis_used, ''), NULLIF(ec.pay_basis, ''), NULLIF(e.pay_basis, ''), NULLIF(e.pay_type, '')) AS pay_basis_used,
      COALESCE(NULLIF(pre.pay_frequency_used, ''), NULLIF(ec.pay_frequency, ''), NULLIF(e.pay_frequency, ''), NULLIF(e.frequency, '')) AS pay_frequency_used,
      COALESCE(pre.hours_per_week_used, ec.hours_per_week, e.hours_per_week, 0) AS hours_used,
      COALESCE(ec.annual_salary, e.annual_salary, e.base_pay, 0) AS annual_salary_used,
      COALESCE(ec.hourly_rate, e.hourly_rate, 0) AS hourly_rate_used,
      e.status AS employee_status,
      ec.status AS contract_status,
      COALESCE(pre.manual_override, false) AS manual_override,
      COALESCE(pre.pay_after_leaving, false) OR COALESCE(ec.pay_after_leaving, false) AS pay_after_leaving,
      COALESCE(pre.included_in_rti, false) AS included_in_rti,
      COALESCE(pre.overtime_pay, 0) AS overtime_pay,
      COALESCE(pre.bonus_pay, 0) AS bonus_pay,
      COALESCE(pre.other_earnings, 0) AS other_earnings
    INTO
      v_company_id,
      v_basis,
      v_freq,
      v_hours,
      v_annual,
      v_hourly,
      v_emp_status,
      v_contract_status,
      v_manual,
      v_pay_after_leaving,
      v_included_in_rti,
      v_overtime,
      v_bonus,
      v_other_earnings
    FROM public.payroll_run_employees pre
    JOIN public.employees e
      ON e.id = pre.employee_id
     AND e.company_id = pre.company_id
    LEFT JOIN public.employee_contracts ec
      ON ec.id = pre.contract_id
     AND ec.employee_id = pre.employee_id
     AND ec.company_id = pre.company_id
    WHERE pre.id = p_prep_id;
  ELSE
    SELECT
      pre.company_id,
      COALESCE(NULLIF(pre.pay_basis_used, ''), NULLIF(ec.pay_basis, ''), NULLIF(e.pay_basis, ''), NULLIF(e.pay_type, '')) AS pay_basis_used,
      COALESCE(NULLIF(pre.pay_frequency_used, ''), NULLIF(ec.pay_frequency, ''), NULLIF(e.pay_frequency, ''), NULLIF(e.frequency, '')) AS pay_frequency_used,
      COALESCE(pre.hours_per_week_used, ec.hours_per_week, e.hours_per_week, 0) AS hours_used,
      COALESCE(ec.annual_salary, e.annual_salary, e.base_pay, 0) AS annual_salary_used,
      COALESCE(ec.hourly_rate, e.hourly_rate, 0) AS hourly_rate_used,
      e.status AS employee_status,
      ec.status AS contract_status,
      false AS manual_override,
      COALESCE(pre.pay_after_leaving, false) OR COALESCE(ec.pay_after_leaving, false) AS pay_after_leaving,
      COALESCE(pre.included_in_rti, false) AS included_in_rti,
      COALESCE(pre.overtime_pay, 0) AS overtime_pay,
      COALESCE(pre.bonus_pay, 0) AS bonus_pay,
      COALESCE(pre.other_earnings, 0) AS other_earnings
    INTO
      v_company_id,
      v_basis,
      v_freq,
      v_hours,
      v_annual,
      v_hourly,
      v_emp_status,
      v_contract_status,
      v_manual,
      v_pay_after_leaving,
      v_included_in_rti,
      v_overtime,
      v_bonus,
      v_other_earnings
    FROM public.payroll_run_employees pre
    JOIN public.employees e
      ON e.id = pre.employee_id
     AND e.company_id = pre.company_id
    LEFT JOIN public.employee_contracts ec
      ON ec.id = pre.contract_id
     AND ec.employee_id = pre.employee_id
     AND ec.company_id = pre.company_id
    WHERE pre.id = p_prep_id;
  END IF;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_included_in_rti IS TRUE THEN
    RETURN;
  END IF;

  IF v_manual IS TRUE THEN
    RETURN;
  END IF;

  IF LOWER(COALESCE(v_emp_status, '')) = 'leaver' AND v_pay_after_leaving IS FALSE THEN
    RETURN;
  END IF;

  IF LOWER(COALESCE(v_contract_status, '')) = 'leaver' AND v_pay_after_leaving IS FALSE THEN
    RETURN;
  END IF;

  v_basic := public.wf_calc_default_basic_pay(v_basis, v_freq, v_annual, v_hourly, v_hours);
  v_gross := ROUND(v_basic + v_overtime + v_bonus + v_other_earnings, 2);

  IF v_has_manual_override THEN
    UPDATE public.payroll_run_employees
       SET basic_pay = v_basic,
           gross_pay = v_gross,
           taxable_pay = v_gross
     WHERE id = p_prep_id
       AND COALESCE(gross_pay, 0) = 0
       AND COALESCE(basic_pay, 0) = 0
       AND COALESCE(taxable_pay, 0) = 0
       AND COALESCE(manual_override, false) = false
       AND COALESCE(included_in_rti, false) = false;
  ELSE
    UPDATE public.payroll_run_employees
       SET basic_pay = v_basic,
           gross_pay = v_gross,
           taxable_pay = v_gross
     WHERE id = p_prep_id
       AND COALESCE(gross_pay, 0) = 0
       AND COALESCE(basic_pay, 0) = 0
       AND COALESCE(taxable_pay, 0) = 0
       AND COALESCE(included_in_rti, false) = false;
  END IF;

  SELECT pet.id
    INTO v_basic_element_type_id
  FROM public.pay_element_types pet
  WHERE pet.code = 'BASIC'
    AND (pet.company_id = v_company_id OR pet.company_id IS NULL)
  ORDER BY
    CASE WHEN pet.company_id = v_company_id THEN 0 ELSE 1 END,
    pet.created_at ASC,
    pet.id ASC
  LIMIT 1;

  IF v_basic_element_type_id IS NOT NULL AND COALESCE(v_basic, 0) > 0 THEN
    INSERT INTO public.payroll_run_pay_elements (
      payroll_run_employee_id,
      pay_element_type_id,
      amount,
      description_override
    )
    SELECT
      p_prep_id,
      v_basic_element_type_id,
      ROUND(v_basic, 2),
      'Basic pay seeded automatically from contract-aware payroll defaults'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.payroll_run_pay_elements pe
      JOIN public.pay_element_types pet
        ON pet.id = pe.pay_element_type_id
      WHERE pe.payroll_run_employee_id = p_prep_id
        AND UPPER(COALESCE(pet.code, '')) = 'BASIC'
    );
  END IF;
END;
$function$;
