-- C:\Projects\wageflow01\supabase\migrations\20260315120000_seed_basic_pay_element_on_auto_attach.sql
-- Ensure auto-attached payroll_run_employees also get a BASIC pay element row.

begin;

create or replace function public.wf_seed_prep_defaults(p_prep_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
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
  v_basic_element_type_id uuid;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payroll_run_employees'
      and column_name = 'manual_override'
  )
  into v_has_manual_override;

  if v_has_manual_override then
    select
      pre.company_id,
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
    into
      v_company_id,
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
    from public.payroll_run_employees pre
    join public.employees e
      on e.id = pre.employee_id
     and e.company_id = pre.company_id
    where pre.id = p_prep_id;
  else
    select
      pre.company_id,
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
    into
      v_company_id,
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
    from public.payroll_run_employees pre
    join public.employees e
      on e.id = pre.employee_id
     and e.company_id = pre.company_id
    where pre.id = p_prep_id;
  end if;

  if not found then
    return;
  end if;

  if v_included_in_rti is true then
    return;
  end if;

  if v_manual is true then
    return;
  end if;

  if lower(coalesce(v_emp_status, '')) = 'leaver' and v_pay_after_leaving is false then
    return;
  end if;

  v_basic := public.wf_calc_default_basic_pay(v_basis, v_freq, v_annual, v_hourly, v_hours);
  v_gross := round(v_basic + v_overtime + v_bonus + v_other_earnings, 2);

  if v_has_manual_override then
    update public.payroll_run_employees
       set basic_pay = v_basic,
           gross_pay = v_gross,
           taxable_pay = v_gross
     where id = p_prep_id
       and coalesce(gross_pay, 0) = 0
       and coalesce(basic_pay, 0) = 0
       and coalesce(taxable_pay, 0) = 0
       and coalesce(manual_override, false) = false
       and coalesce(included_in_rti, false) = false;
  else
    update public.payroll_run_employees
       set basic_pay = v_basic,
           gross_pay = v_gross,
           taxable_pay = v_gross
     where id = p_prep_id
       and coalesce(gross_pay, 0) = 0
       and coalesce(basic_pay, 0) = 0
       and coalesce(taxable_pay, 0) = 0
       and coalesce(included_in_rti, false) = false;
  end if;

  select pet.id
    into v_basic_element_type_id
  from public.pay_element_types pet
  where pet.code = 'BASIC'
    and (pet.company_id = v_company_id or pet.company_id is null)
  order by
    case when pet.company_id = v_company_id then 0 else 1 end,
    pet.created_at asc,
    pet.id asc
  limit 1;

  if v_basic_element_type_id is not null and coalesce(v_basic, 0) > 0 then
    insert into public.payroll_run_pay_elements (
      payroll_run_employee_id,
      pay_element_type_id,
      amount
    )
    select
      p_prep_id,
      v_basic_element_type_id,
      round(v_basic, 2)
    where not exists (
      select 1
      from public.payroll_run_pay_elements pe
      join public.pay_element_types pet
        on pet.id = pe.pay_element_type_id
      where pe.payroll_run_employee_id = p_prep_id
        and upper(coalesce(pet.code, '')) = 'BASIC'
    );
  end if;
end;
$$;

do $$
declare
  v_has_manual_override boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payroll_run_employees'
      and column_name = 'manual_override'
  )
  into v_has_manual_override;

  if v_has_manual_override then
    with candidates as (
      select
        pre.id as payroll_run_employee_id,
        pre.company_id,
        case
          when coalesce(pre.basic_pay, 0) > 0 then round(pre.basic_pay, 2)
          else public.wf_calc_default_basic_pay(
            pre.pay_basis_used,
            pre.pay_frequency_used,
            e.annual_salary,
            e.hourly_rate,
            coalesce(pre.hours_per_week_used, e.hours_per_week, 0)
          )
        end as amount
      from public.payroll_run_employees pre
      join public.employees e
        on e.id = pre.employee_id
       and e.company_id = pre.company_id
      where coalesce(pre.manual_override, false) = false
        and coalesce(pre.included_in_rti, false) = false
        and (lower(coalesce(e.status, '')) <> 'leaver' or coalesce(pre.pay_after_leaving, false) = true)
    )
    insert into public.payroll_run_pay_elements (
      payroll_run_employee_id,
      pay_element_type_id,
      amount
    )
    select
      c.payroll_run_employee_id,
      bt.id,
      c.amount
    from candidates c
    join lateral (
      select pet.id
      from public.pay_element_types pet
      where pet.code = 'BASIC'
        and (pet.company_id = c.company_id or pet.company_id is null)
      order by
        case when pet.company_id = c.company_id then 0 else 1 end,
        pet.created_at asc,
        pet.id asc
      limit 1
    ) bt on true
    where c.amount > 0
      and not exists (
        select 1
        from public.payroll_run_pay_elements pe
        join public.pay_element_types pet
          on pet.id = pe.pay_element_type_id
        where pe.payroll_run_employee_id = c.payroll_run_employee_id
          and upper(coalesce(pet.code, '')) = 'BASIC'
      );
  else
    with candidates as (
      select
        pre.id as payroll_run_employee_id,
        pre.company_id,
        case
          when coalesce(pre.basic_pay, 0) > 0 then round(pre.basic_pay, 2)
          else public.wf_calc_default_basic_pay(
            pre.pay_basis_used,
            pre.pay_frequency_used,
            e.annual_salary,
            e.hourly_rate,
            coalesce(pre.hours_per_week_used, e.hours_per_week, 0)
          )
        end as amount
      from public.payroll_run_employees pre
      join public.employees e
        on e.id = pre.employee_id
       and e.company_id = pre.company_id
      where coalesce(pre.included_in_rti, false) = false
        and (lower(coalesce(e.status, '')) <> 'leaver' or coalesce(pre.pay_after_leaving, false) = true)
    )
    insert into public.payroll_run_pay_elements (
      payroll_run_employee_id,
      pay_element_type_id,
      amount
    )
    select
      c.payroll_run_employee_id,
      bt.id,
      c.amount
    from candidates c
    join lateral (
      select pet.id
      from public.pay_element_types pet
      where pet.code = 'BASIC'
        and (pet.company_id = c.company_id or pet.company_id is null)
      order by
        case when pet.company_id = c.company_id then 0 else 1 end,
        pet.created_at asc,
        pet.id asc
      limit 1
    ) bt on true
    where c.amount > 0
      and not exists (
        select 1
        from public.payroll_run_pay_elements pe
        join public.pay_element_types pet
          on pet.id = pe.pay_element_type_id
        where pe.payroll_run_employee_id = c.payroll_run_employee_id
          and upper(coalesce(pet.code, '')) = 'BASIC'
      );
  end if;
end $$;

commit;