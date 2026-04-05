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
  coalesce(e.start_date, e.hire_date, current_date) as start_date,
  coalesce(e.leave_date, e.leaving_date, e.final_pay_date) as leave_date,
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
);