-- C:\Projects\wageflow01\supabase\migrations\20260405123000_backfill_employee_contracts.sql
-- Backfill employee_contracts from employees.
-- Guarded because Supabase Preview may replay this migration before all legacy employee columns exist.

do $$
declare
  required_columns text[] := array[
    'company_id',
    'id',
    'employee_number',
    'job_title',
    'department',
    'status',
    'start_date',
    'pay_frequency',
    'frequency',
    'pay_basis',
    'pay_type',
    'annual_salary',
    'hourly_rate',
    'hours_per_week',
    'pay_after_leaving'
  ];
  missing_column text;
begin
  if to_regclass('public.employees') is null
     or to_regclass('public.employee_contracts') is null then
    return;
  end if;

  select c.column_name
    into missing_column
  from unnest(required_columns) as c(column_name)
  where not exists (
    select 1
    from information_schema.columns ic
    where ic.table_schema = 'public'
      and ic.table_name = 'employees'
      and ic.column_name = c.column_name
  )
  limit 1;

  if missing_column is not null then
    raise notice 'Skipping employee_contracts backfill because public.employees.% does not exist yet.', missing_column;
    return;
  end if;

  execute $sql$
    insert into public.employee_contracts (
      company_id,
      employee_id,
      contract_number,
      job_title,
      department,
      status,
      start_date,
      leave_date,
      pay_frequency,
      pay_basis,
      annual_salary,
      hourly_rate,
      hours_per_week,
      pay_after_leaving
    )
    select
      e.company_id,
      e.id as employee_id,
      case
        when nullif(regexp_replace(coalesce(trim(e.employee_number), ''), '[^A-Za-z0-9-]', '', 'g'), '') is not null
          then regexp_replace(trim(e.employee_number), '[^A-Za-z0-9-]', '', 'g') || '-01'
        else 'EMP-' || left(e.id::text, 8) || '-01'
      end as contract_number,
      e.job_title,
      e.department,
      case lower(coalesce(trim(e.status), 'active'))
        when 'active' then 'active'
        when 'inactive' then 'inactive'
        when 'leaver' then 'leaver'
        else 'active'
      end as status,
      coalesce(e.start_date, current_date) as start_date,
      null as leave_date,
      case lower(coalesce(nullif(trim(e.pay_frequency), ''), nullif(trim(e.frequency), ''), 'monthly'))
        when 'weekly' then 'weekly'
        when 'fortnightly' then 'fortnightly'
        when 'four_weekly' then 'four_weekly'
        when '4-weekly' then 'four_weekly'
        when '4 weekly' then 'four_weekly'
        when 'monthly' then 'monthly'
        else 'monthly'
      end as pay_frequency,
      case lower(coalesce(nullif(trim(e.pay_basis), ''), nullif(trim(e.pay_type), ''), 'salary'))
        when 'salary' then 'salary'
        when 'salaried' then 'salary'
        when 'hourly' then 'hourly'
        when 'hour' then 'hourly'
        else 'salary'
      end as pay_basis,
      e.annual_salary,
      e.hourly_rate,
      e.hours_per_week,
      coalesce(e.pay_after_leaving, false) as pay_after_leaving
    from public.employees e
    where not exists (
      select 1
      from public.employee_contracts ec
      where ec.employee_id = e.id
    )
  $sql$;
end $$;