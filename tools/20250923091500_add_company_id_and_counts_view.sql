-- 20250923091500_add_company_id_and_counts_view.sql

-- 1) Ensure pay_run_employees has company_id and it’s backfilled
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'pay_run_employees'
      and column_name  = 'company_id'
  ) then
    alter table public.pay_run_employees
      add column company_id uuid;

    update public.pay_run_employees pre
    set company_id = e.company_id
    from public.employees e
    where e.id = pre.employee_id
      and pre.company_id is null;

    alter table public.pay_run_employees
      alter column company_id set not null;

    create index if not exists idx_pre_company_id on public.pay_run_employees(company_id);
    create index if not exists idx_pre_employee_id on public.pay_run_employees(employee_id);
  end if;
end $$;

-- 2) Recreate counts view with stable column list and order
drop view if exists public.employee_run_counts;

create view public.employee_run_counts as
select
  e.id         as employee_id,
  e.company_id as company_id,
  coalesce(count(pre.employee_id), 0)::int as run_count
from public.employees e
left join public.pay_run_employees pre
  on pre.employee_id = e.id
 and pre.company_id  = e.company_id
group by e.id, e.company_id;

-- Optional dev grants. Comment out if you enforce via roles elsewhere.
-- grant select on public.employee_run_counts to anon, authenticated;
