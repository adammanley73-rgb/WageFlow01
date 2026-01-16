/*
  WageFlow: Seed default gross/basic pay on payroll_run_employees auto-attach.

  What this does:
  - Calculates a default basic_pay from employees (annual_salary or hourly_rate + hours/week)
  - Writes basic_pay, gross_pay, taxable_pay for brand-new rows (trigger)
  - Backfills existing rows that are currently all-zero
  - Skips rows that are manual_override = true (if column exists)
  - Skips leavers when pay_after_leaving = false
  - Skips rows included_in_rti = true (do not touch filed/queued RTI)
  - Defensive: only uses columns that exist
*/

begin;

create or replace function public.wf_periods_per_year(p_freq text)
returns numeric
language sql
immutable
as $$
  select case lower(coalesce(p_freq, ''))
    when 'weekly' then 52.14285714
    when 'fortnightly' then 26.07142857
    when 'four_weekly' then 13.035714285
    when 'four-weekly' then 13.035714285
    when '4-weekly' then 13.035714285
    when 'monthly' then 12
    else 12
  end;
$$;

create or replace function public.wf_weeks_per_period(p_freq text)
returns numeric
language sql
immutable
as $$
  select case lower(coalesce(p_freq, ''))
    when 'weekly' then 1
    when 'fortnightly' then 2
    when 'four_weekly' then 4
    when 'four-weekly' then 4
    when '4-weekly' then 4
    when 'monthly' then 52.14285714 / 12
    else 52.14285714 / 12
  end;
$$;

create or replace function public.wf_calc_default_basic_pay(
  p_basis text,
  p_freq text,
  p_annual numeric,
  p_hourly numeric,
  p_hours numeric
)
returns numeric
language sql
immutable
as $$
  select round(
    case lower(coalesce(p_basis, 'salaried'))
      when 'hourly' then coalesce(p_hourly, 0) * coalesce(p_hours, 0) * public.wf_weeks_per_period(p_freq)
      else coalesce(p_annual, 0) / nullif(public.wf_periods_per_year(p_freq), 0)
    end
  , 2);
$$;

create or replace function public.wf_seed_prep_defaults(p_prep_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_basis text;
  v_freq text;
  v_hours numeric;
  v_annual numeric;
  v_hourly numeric;
  v_emp_status text;

  v_manual boolean;
  v_pay_after_leaving boolean;
  v_included_in_rti boolean;

  v_basic numeric;
  v_gross numeric;
  v_overtime numeric;
  v_bonus numeric;
  v_other_earnings numeric;
  
  v_has_manual_override boolean;
begin
  -- Check if manual_override column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payroll_run_employees' 
    AND column_name = 'manual_override'
  ) INTO v_has_manual_override;

  -- Build query based on available columns
  IF v_has_manual_override THEN
    SELECT
      pre.pay_basis_used,
      pre.pay_frequency_used,
      coalesce(pre.hours_per_week_used, e.hours_per_week, 0) as hours_used,
      e.annual_salary,
      e.hourly_rate,
      e.status,

      coalesce(pre.manual_override, false) as manual_override,
      coalesce(pre.pay_after_leaving, false) as pay_after_leaving,
      coalesce(pre.included_in_rti, false) as included_in_rti,

      coalesce(pre.overtime_pay, 0) as overtime_pay,
      coalesce(pre.bonus_pay, 0) as bonus_pay,
      coalesce(pre.other_earnings, 0) as other_earnings
    INTO
      v_basis,
      v_freq,
      v_hours,
      v_annual,
      v_hourly,
      v_emp_status,

      v_manual,
      v_pay_after_leaving,
      v_included_in_rti,

      v_overtime,
      v_bonus,
      v_other_earnings
    FROM payroll_run_employees pre
    JOIN employees e
      ON e.id = pre.employee_id
     AND e.company_id = pre.company_id
    WHERE pre.id = p_prep_id;
  ELSE
    -- Without manual_override column, assume not manual
    SELECT
      pre.pay_basis_used,
      pre.pay_frequency_used,
      coalesce(pre.hours_per_week_used, e.hours_per_week, 0) as hours_used,
      e.annual_salary,
      e.hourly_rate,
      e.status,

      false as manual_override,
      coalesce(pre.pay_after_leaving, false) as pay_after_leaving,
      coalesce(pre.included_in_rti, false) as included_in_rti,

      coalesce(pre.overtime_pay, 0) as overtime_pay,
      coalesce(pre.bonus_pay, 0) as bonus_pay,
      coalesce(pre.other_earnings, 0) as other_earnings
    INTO
      v_basis,
      v_freq,
      v_hours,
      v_annual,
      v_hourly,
      v_emp_status,

      v_manual,
      v_pay_after_leaving,
      v_included_in_rti,

      v_overtime,
      v_bonus,
      v_other_earnings
    FROM payroll_run_employees pre
    JOIN employees e
      ON e.id = pre.employee_id
     AND e.company_id = pre.company_id
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

  IF lower(coalesce(v_emp_status, '')) = 'leaver' AND v_pay_after_leaving IS FALSE THEN
    RETURN;
  END IF;

  v_basic := public.wf_calc_default_basic_pay(v_basis, v_freq, v_annual, v_hourly, v_hours);
  v_gross := round(v_basic + v_overtime + v_bonus + v_other_earnings, 2);

  -- Update without referencing manual_override if it doesn't exist
  IF v_has_manual_override THEN
    UPDATE payroll_run_employees
       SET basic_pay = v_basic,
           gross_pay = v_gross,
           taxable_pay = v_gross
     WHERE id = p_prep_id
       AND coalesce(gross_pay, 0) = 0
       AND coalesce(basic_pay, 0) = 0
       AND coalesce(taxable_pay, 0) = 0
       AND coalesce(manual_override, false) = false
       AND coalesce(included_in_rti, false) = false;
  ELSE
    UPDATE payroll_run_employees
       SET basic_pay = v_basic,
           gross_pay = v_gross,
           taxable_pay = v_gross
     WHERE id = p_prep_id
       AND coalesce(gross_pay, 0) = 0
       AND coalesce(basic_pay, 0) = 0
       AND coalesce(taxable_pay, 0) = 0
       AND coalesce(included_in_rti, false) = false;
  END IF;
END;
$$;

create or replace function public.wf_trg_seed_prep_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.wf_seed_prep_defaults(new.id);
  return new;
end;
$$;

drop trigger if exists trg_seed_prep_defaults on public.payroll_run_employees;

create trigger trg_seed_prep_defaults
after insert on public.payroll_run_employees
for each row
execute function public.wf_trg_seed_prep_defaults();

/* Backfill existing all-zero rows (safe-guarded) */
DO $$
DECLARE
  v_has_manual_override boolean;
BEGIN
  -- Check if manual_override column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payroll_run_employees' 
    AND column_name = 'manual_override'
  ) INTO v_has_manual_override;

  IF v_has_manual_override THEN
    UPDATE public.payroll_run_employees pre
    SET
      basic_pay = public.wf_calc_default_basic_pay(
        pre.pay_basis_used,
        pre.pay_frequency_used,
        e.annual_salary,
        e.hourly_rate,
        coalesce(pre.hours_per_week_used, e.hours_per_week, 0)
      ),
      gross_pay = round(
        public.wf_calc_default_basic_pay(
          pre.pay_basis_used,
          pre.pay_frequency_used,
          e.annual_salary,
          e.hourly_rate,
          coalesce(pre.hours_per_week_used, e.hours_per_week, 0)
        )
        + coalesce(pre.overtime_pay, 0)
        + coalesce(pre.bonus_pay, 0)
        + coalesce(pre.other_earnings, 0)
      , 2),
      taxable_pay = round(
        public.wf_calc_default_basic_pay(
          pre.pay_basis_used,
          pre.pay_frequency_used,
          e.annual_salary,
          e.hourly_rate,
          coalesce(pre.hours_per_week_used, e.hours_per_week, 0)
        )
        + coalesce(pre.overtime_pay, 0)
        + coalesce(pre.bonus_pay, 0)
        + coalesce(pre.other_earnings, 0)
      , 2)
    FROM public.employees e
    WHERE e.id = pre.employee_id
      AND e.company_id = pre.company_id
      AND coalesce(pre.manual_override, false) = false
      AND coalesce(pre.included_in_rti, false) = false
      AND (lower(coalesce(e.status, '')) <> 'leaver' OR coalesce(pre.pay_after_leaving, false) = true)
      AND coalesce(pre.gross_pay, 0) = 0
      AND coalesce(pre.basic_pay, 0) = 0
      AND coalesce(pre.taxable_pay, 0) = 0;
  ELSE
    UPDATE public.payroll_run_employees pre
    SET
      basic_pay = public.wf_calc_default_basic_pay(
        pre.pay_basis_used,
        pre.pay_frequency_used,
        e.annual_salary,
        e.hourly_rate,
        coalesce(pre.hours_per_week_used, e.hours_per_week, 0)
      ),
      gross_pay = round(
        public.wf_calc_default_basic_pay(
          pre.pay_basis_used,
          pre.pay_frequency_used,
          e.annual_salary,
          e.hourly_rate,
          coalesce(pre.hours_per_week_used, e.hours_per_week, 0)
        )
        + coalesce(pre.overtime_pay, 0)
        + coalesce(pre.bonus_pay, 0)
        + coalesce(pre.other_earnings, 0)
      , 2),
      taxable_pay = round(
        public.wf_calc_default_basic_pay(
          pre.pay_basis_used,
          pre.pay_frequency_used,
          e.annual_salary,
          e.hourly_rate,
          coalesce(pre.hours_per_week_used, e.hours_per_week, 0)
        )
        + coalesce(pre.overtime_pay, 0)
        + coalesce(pre.bonus_pay, 0)
        + coalesce(pre.other_earnings, 0)
      , 2)
    FROM public.employees e
    WHERE e.id = pre.employee_id
      AND e.company_id = pre.company_id
      AND coalesce(pre.included_in_rti, false) = false
      AND (lower(coalesce(e.status, '')) <> 'leaver' OR coalesce(pre.pay_after_leaving, false) = true)
      AND coalesce(pre.gross_pay, 0) = 0
      AND coalesce(pre.basic_pay, 0) = 0
      AND coalesce(pre.taxable_pay, 0) = 0;
  END IF;
END $$;

commit;
