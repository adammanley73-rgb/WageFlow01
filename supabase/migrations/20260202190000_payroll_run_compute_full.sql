-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20260202190000_payroll_run_compute_full.sql

-- Purpose:
-- v1 "compute full" RPC for WageFlow.
-- Rolls up payroll_run_pay_elements into gross/deductions/net per employee,
-- writes to payroll_run_employees, marks calc_mode = full,
-- and recalculates run totals.

create or replace function public.payroll_run_compute_full(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run_exists boolean;
  v_updated int := 0;
  r_emp record;

  v_earnings numeric := 0;
  v_deductions numeric := 0;
  v_tax numeric := 0;
  v_ni_employee numeric := 0;
  v_ni_employer numeric := 0;

  v_gross numeric := 0;
  v_net numeric := 0;
begin
  select exists(select 1 from public.payroll_runs pr where pr.id = p_run_id)
    into v_run_exists;

  if not v_run_exists then
    raise exception 'payroll_run_compute_full: run not found: %', p_run_id;
  end if;

  for r_emp in
    select pre.employee_id
    from public.payroll_run_employees pre
    where pre.run_id = p_run_id
  loop
    select
      coalesce(sum(case
        when coalesce(pe.is_deduction,false) = false and pe.amount > 0 then pe.amount
        else 0
      end),0) as earnings_sum,

      coalesce(sum(case
        when coalesce(pe.is_deduction,false) = true then abs(pe.amount)
        when coalesce(pe.is_deduction,false) = false and pe.amount < 0 then abs(pe.amount)
        else 0
      end),0) as deductions_sum,

      coalesce(sum(case
        when upper(coalesce(pe.element_code,'')) in ('PAYE','PAYE_TAX','TAX','INCOME_TAX') then abs(pe.amount)
        else 0
      end),0) as tax_sum,

      coalesce(sum(case
        when upper(coalesce(pe.element_code,'')) in ('NI','EE_NI','EMP_NI','NI_EMPLOYEE') then abs(pe.amount)
        else 0
      end),0) as ni_employee_sum,

      coalesce(sum(case
        when upper(coalesce(pe.element_code,'')) in ('NI_ER','ER_NI','NI_EMPLOYER') then abs(pe.amount)
        else 0
      end),0) as ni_employer_sum
    into
      v_earnings,
      v_deductions,
      v_tax,
      v_ni_employee,
      v_ni_employer
    from public.payroll_run_pay_elements pe
    where pe.run_id = p_run_id
      and pe.employee_id = r_emp.employee_id;

    v_gross := v_earnings;
    v_net := v_earnings - v_deductions;

    update public.payroll_run_employees
    set
      gross_pay = v_gross,
      net_pay = v_net,
      tax = v_tax,
      ni_employee = v_ni_employee,
      ni_employer = v_ni_employer,
      calc_mode = 'full'
    where run_id = p_run_id
      and employee_id = r_emp.employee_id;

    v_updated := v_updated + 1;
  end loop;

  perform public.recalc_payroll_run_totals(p_run_id);

  return jsonb_build_object(
    'ok', true,
    'run_id', p_run_id,
    'employees_updated', v_updated
  );
end;
$$;

grant execute on function public.payroll_run_compute_full(uuid) to authenticated;
grant execute on function public.payroll_run_compute_full(uuid) to service_role;
