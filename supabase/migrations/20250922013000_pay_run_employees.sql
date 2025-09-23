-- Join table for employees included in a payroll run
create table if not exists public.pay_run_employees (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  company_id uuid not null,
  created_at timestamptz not null default now(),
  unique (run_id, employee_id)
);

create index if not exists idx_pre_run       on public.pay_run_employees(run_id);
create index if not exists idx_pre_employee  on public.pay_run_employees(employee_id);
create index if not exists idx_pre_company   on public.pay_run_employees(company_id);

-- Optional helper view used by UI to enable/disable delete buttons
create or replace view public.employee_run_counts as
select
  e.id as employee_id,
  count(pre.id)::int as run_count
from public.employees e
left join public.pay_run_employees pre
  on pre.employee_id = e.id
group by e.id;
