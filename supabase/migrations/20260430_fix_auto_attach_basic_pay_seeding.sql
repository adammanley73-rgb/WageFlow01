create or replace function public.attach_due_employees_to_run(p_run_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'wf_util'
as $function$
declare
  v_company_id uuid;
  v_frequency text;
  v_status text;
  v_workflow_status text;
  v_period_start date;
  v_period_end date;

  v_basic_type_id uuid;

  v_inserted integer := 0;
  v_removed integer := 0;
  v_basic_seeded integer := 0;
  v_due_count integer := 0;
  v_attached_count integer := 0;
begin
  select
    company_id,
    frequency,
    status,
    workflow_status,
    coalesce(period_start, pay_period_start),
    coalesce(period_end, pay_period_end)
  into
    v_company_id,
    v_frequency,
    v_status,
    v_workflow_status,
    v_period_start,
    v_period_end
  from public.payroll_runs
  where id = p_run_id;

  if not found then
    raise exception 'attach_due_employees_to_run: payroll_run % not found', p_run_id;
  end if;

  if v_company_id is null then
    raise exception 'attach_due_employees_to_run: payroll_run % has no company_id', p_run_id;
  end if;

  if v_frequency is null or btrim(v_frequency) = '' then
    raise exception 'attach_due_employees_to_run: payroll_run % has no frequency', p_run_id;
  end if;

  if v_period_start is null or v_period_end is null then
    raise exception 'attach_due_employees_to_run: payroll_run % has no period_start/period_end', p_run_id;
  end if;

  if coalesce(nullif(btrim(v_status), ''), 'draft') <> 'draft'
     or coalesce(nullif(btrim(v_workflow_status), ''), 'draft') <> 'draft' then
    raise exception 'attach_due_employees_to_run: run % is not draft (status %, workflow_status %)', p_run_id, v_status, v_workflow_status;
  end if;

  select pet.id
  into v_basic_type_id
  from public.pay_element_types pet
  where upper(coalesce(pet.code, '')) = 'BASIC'
    and (
      pet.company_id = v_company_id
      or pet.company_id is null
    )
  order by
    case when pet.company_id = v_company_id then 0 else 1 end,
    pet.created_at nulls last
  limit 1;

  if v_basic_type_id is null then
    raise exception 'attach_due_employees_to_run: BASIC pay element type not found for company %', v_company_id;
  end if;

  with eligible as (
    select
      e.id as employee_id,
      ec.id as contract_id,
      v_company_id as company_id
    from public.employee_contracts ec
    join public.employees e
      on e.id = ec.employee_id
    where
      e.company_id = v_company_id
      and ec.company_id = v_company_id
      and lower(coalesce(ec.pay_frequency, '')) = lower(v_frequency)
      and ec.start_date <= v_period_end
      and (
        ec.leave_date is null
        or ec.leave_date >= v_period_start
        or coalesce(ec.pay_after_leaving, false) = true
      )
      and (
        lower(coalesce(e.status, '')) = 'active'
        or (
          lower(coalesce(e.status, '')) = 'leaver'
          and coalesce(e.pay_after_leaving, false) = true
          and e.final_pay_date is not null
          and e.final_pay_date >= v_period_start
          and e.final_pay_date <= v_period_end
        )
      )
      and (
        lower(coalesce(ec.status, '')) = 'active'
        or (
          lower(coalesce(ec.status, '')) = 'leaver'
          and coalesce(ec.pay_after_leaving, false) = true
        )
      )
  ),
  removed as (
    delete from public.payroll_run_employees pre
    where pre.run_id = p_run_id
      and (
        pre.contract_id is null
        or not exists (
          select 1
          from eligible eg
          where eg.contract_id = pre.contract_id
        )
      )
      and coalesce(pre.included_in_rti, false) = false
      and not exists (
        select 1
        from public.payroll_run_pay_elements prpe
        where prpe.payroll_run_employee_id = pre.id
      )
    returning 1
  )
  select count(*)
  into v_removed
  from removed;

  with eligible as (
    select
      e.id as employee_id,
      ec.id as contract_id,
      v_company_id as company_id,
      e.tax_code as tax_code,
      e.tax_code_basis as tax_code_basis,
      e.ni_category as ni_category,
      e.student_loan as student_loan,
      e.postgraduate_loan as postgraduate_loan,
      ec.pay_frequency as pay_frequency,
      ec.pay_basis as pay_basis,
      ec.hours_per_week as hours_per_week,
      ec.pay_after_leaving as pay_after_leaving
    from public.employee_contracts ec
    join public.employees e
      on e.id = ec.employee_id
    where
      e.company_id = v_company_id
      and ec.company_id = v_company_id
      and lower(coalesce(ec.pay_frequency, '')) = lower(v_frequency)
      and ec.start_date <= v_period_end
      and (
        ec.leave_date is null
        or ec.leave_date >= v_period_start
        or coalesce(ec.pay_after_leaving, false) = true
      )
      and (
        lower(coalesce(e.status, '')) = 'active'
        or (
          lower(coalesce(e.status, '')) = 'leaver'
          and coalesce(e.pay_after_leaving, false) = true
          and e.final_pay_date is not null
          and e.final_pay_date >= v_period_start
          and e.final_pay_date <= v_period_end
        )
      )
      and (
        lower(coalesce(ec.status, '')) = 'active'
        or (
          lower(coalesce(ec.status, '')) = 'leaver'
          and coalesce(ec.pay_after_leaving, false) = true
        )
      )
  ),
  to_insert as (
    select
      p_run_id as run_id,
      eg.employee_id as employee_id,
      eg.contract_id as contract_id,
      eg.company_id as company_id,
      eg.tax_code as tax_code_used,
      eg.tax_code_basis as tax_code_basis_used,
      eg.ni_category as ni_category_used,
      coalesce(eg.student_loan, 'none') as student_loan_used,
      coalesce(eg.postgraduate_loan, false) as pg_loan_used,
      coalesce(eg.pay_frequency, v_frequency) as pay_frequency_used,
      eg.pay_basis as pay_basis_used,
      eg.hours_per_week as hours_per_week_used,
      coalesce(eg.pay_after_leaving, false) as pay_after_leaving
    from eligible eg
    where not exists (
      select 1
      from public.payroll_run_employees pre
      where pre.run_id = p_run_id
        and pre.contract_id = eg.contract_id
    )
  ),
  inserted as (
    insert into public.payroll_run_employees (
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
    select
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
    from to_insert
    returning 1
  )
  select count(*)
  into v_inserted
  from inserted;

  with eligible_attached as (
    select
      pre.id as payroll_run_employee_id,
      ec.id as contract_id,
      lower(coalesce(ec.pay_basis, '')) as pay_basis,
      lower(coalesce(ec.pay_frequency, v_frequency, '')) as pay_frequency,
      ec.annual_salary,
      ec.hourly_rate,
      ec.hours_per_week
    from public.payroll_run_employees pre
    join public.employee_contracts ec
      on ec.id = pre.contract_id
    join public.employees e
      on e.id = pre.employee_id
    where pre.run_id = p_run_id
      and pre.company_id = v_company_id
      and e.company_id = v_company_id
      and ec.company_id = v_company_id
      and lower(coalesce(ec.pay_frequency, '')) = lower(v_frequency)
      and ec.start_date <= v_period_end
      and (
        ec.leave_date is null
        or ec.leave_date >= v_period_start
        or coalesce(ec.pay_after_leaving, false) = true
      )
      and (
        lower(coalesce(e.status, '')) = 'active'
        or (
          lower(coalesce(e.status, '')) = 'leaver'
          and coalesce(e.pay_after_leaving, false) = true
          and e.final_pay_date is not null
          and e.final_pay_date >= v_period_start
          and e.final_pay_date <= v_period_end
        )
      )
      and (
        lower(coalesce(ec.status, '')) = 'active'
        or (
          lower(coalesce(ec.status, '')) = 'leaver'
          and coalesce(ec.pay_after_leaving, false) = true
        )
      )
  ),
  basic_amounts as (
    select
      ea.payroll_run_employee_id,
      case
        when ea.pay_basis in ('salary', 'salaried')
          and coalesce(ea.annual_salary, 0) > 0
          and ea.pay_frequency = 'weekly'
          then round((ea.annual_salary / 52.14285714)::numeric, 2)

        when ea.pay_basis in ('salary', 'salaried')
          and coalesce(ea.annual_salary, 0) > 0
          and ea.pay_frequency = 'fortnightly'
          then round(((ea.annual_salary / 52.14285714) * 2)::numeric, 2)

        when ea.pay_basis in ('salary', 'salaried')
          and coalesce(ea.annual_salary, 0) > 0
          and ea.pay_frequency = 'four_weekly'
          then round(((ea.annual_salary / 52.14285714) * 4)::numeric, 2)

        when ea.pay_basis in ('salary', 'salaried')
          and coalesce(ea.annual_salary, 0) > 0
          and ea.pay_frequency = 'monthly'
          then round((ea.annual_salary / 12)::numeric, 2)

        when ea.pay_basis = 'hourly'
          and coalesce(ea.hourly_rate, 0) > 0
          and coalesce(ea.hours_per_week, 0) > 0
          and ea.pay_frequency = 'weekly'
          then round((ea.hourly_rate * ea.hours_per_week)::numeric, 2)

        when ea.pay_basis = 'hourly'
          and coalesce(ea.hourly_rate, 0) > 0
          and coalesce(ea.hours_per_week, 0) > 0
          and ea.pay_frequency = 'fortnightly'
          then round(((ea.hourly_rate * ea.hours_per_week) * 2)::numeric, 2)

        when ea.pay_basis = 'hourly'
          and coalesce(ea.hourly_rate, 0) > 0
          and coalesce(ea.hours_per_week, 0) > 0
          and ea.pay_frequency = 'four_weekly'
          then round(((ea.hourly_rate * ea.hours_per_week) * 4)::numeric, 2)

        when ea.pay_basis = 'hourly'
          and coalesce(ea.hourly_rate, 0) > 0
          and coalesce(ea.hours_per_week, 0) > 0
          and ea.pay_frequency = 'monthly'
          then round(((ea.hourly_rate * ea.hours_per_week * 52.14285714) / 12)::numeric, 2)

        else 0
      end as amount
    from eligible_attached ea
  ),
  seeded_basic as (
    insert into public.payroll_run_pay_elements (
      payroll_run_employee_id,
      pay_element_type_id,
      amount,
      taxable_for_paye_override,
      nic_earnings_override,
      pensionable_override,
      ae_qualifying_override,
      description_override
    )
    select
      ba.payroll_run_employee_id,
      v_basic_type_id,
      ba.amount,
      null,
      null,
      null,
      null,
      'Basic pay (created automatically on attach)'
    from basic_amounts ba
    where ba.amount > 0
      and not exists (
        select 1
        from public.payroll_run_pay_elements prpe
        where prpe.payroll_run_employee_id = ba.payroll_run_employee_id
          and prpe.pay_element_type_id = v_basic_type_id
      )
    returning 1
  )
  select count(*)
  into v_basic_seeded
  from seeded_basic;

  with eligible as (
    select
      ec.id as contract_id
    from public.employee_contracts ec
    join public.employees e
      on e.id = ec.employee_id
    where
      e.company_id = v_company_id
      and ec.company_id = v_company_id
      and lower(coalesce(ec.pay_frequency, '')) = lower(v_frequency)
      and ec.start_date <= v_period_end
      and (
        ec.leave_date is null
        or ec.leave_date >= v_period_start
        or coalesce(ec.pay_after_leaving, false) = true
      )
      and (
        lower(coalesce(e.status, '')) = 'active'
        or (
          lower(coalesce(e.status, '')) = 'leaver'
          and coalesce(e.pay_after_leaving, false) = true
          and e.final_pay_date is not null
          and e.final_pay_date >= v_period_start
          and e.final_pay_date <= v_period_end
        )
      )
      and (
        lower(coalesce(ec.status, '')) = 'active'
        or (
          lower(coalesce(ec.status, '')) = 'leaver'
          and coalesce(ec.pay_after_leaving, false) = true
        )
      )
  )
  select
    count(*),
    (
      select count(distinct pre.contract_id)
      from public.payroll_run_employees pre
      where pre.run_id = p_run_id
        and pre.contract_id is not null
        and exists (
          select 1
          from eligible eg
          where eg.contract_id = pre.contract_id
        )
    )
  into
    v_due_count,
    v_attached_count
  from eligible;

  update public.payroll_runs
  set
    attached_all_due_employees = (coalesce(v_due_count, 0) = coalesce(v_attached_count, 0)),
    updated_at = now()
  where id = p_run_id;

  return coalesce(v_inserted, 0);
end;
$function$;