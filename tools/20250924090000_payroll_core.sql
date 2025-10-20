-- 20250924090000_payroll_core.sql
-- Core payroll model with company scoping and RLS. Uses (auth.jwt()->>'company_id')::uuid.

-- 1) Pay runs
create table if not exists public.pay_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  frequency text not null check (frequency in ('weekly','fortnightly','fourweekly','monthly')),
  period_start date not null,
  period_end date not null,
  pay_date date not null,
  status text not null default 'draft' check (status in ('draft','posted','void')),
  created_at timestamptz not null default now()
);
create index if not exists idx_pay_runs_company on public.pay_runs(company_id);
create index if not exists idx_pay_runs_status on public.pay_runs(status);
alter table public.pay_runs enable row level security;

-- 2) Employees attached to a run
create table if not exists public.pay_run_employees (
  id uuid primary key default gen_random_uuid(),
  pay_run_id uuid not null references public.pay_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  company_id uuid not null,
  status text not null default 'pending' check (status in ('pending','calculated','posted')),
  created_at timestamptz not null default now(),
  unique (pay_run_id, employee_id)
);
create index if not exists idx_pre_run on public.pay_run_employees(pay_run_id);
create index if not exists idx_pre_emp on public.pay_run_employees(employee_id);
create index if not exists idx_pre_company on public.pay_run_employees(company_id);
alter table public.pay_run_employees enable row level security;

-- 3) Optional input items captured before calc (allowances/deductions)
create table if not exists public.pay_items (
  id uuid primary key default gen_random_uuid(),
  run_employee_id uuid not null references public.pay_run_employees(id) on delete cascade,
  company_id uuid not null,
  type text not null,       -- e.g. 'basic','overtime','allowance','deduction'
  amount numeric(12,2) not null,
  qty numeric(12,3),
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_items_run_emp on public.pay_items(run_employee_id);
create index if not exists idx_items_company on public.pay_items(company_id);
alter table public.pay_items enable row level security;

-- 4) Calculation result snapshot (immutable once posted)
create table if not exists public.pay_results (
  id uuid primary key default gen_random_uuid(),
  run_employee_id uuid not null references public.pay_run_employees(id) on delete cascade,
  company_id uuid not null,
  lines jsonb not null,     -- detailed calc lines
  totals jsonb not null,    -- gross, tax, ee_ni, er_ni, loans, pension, net
  ytd jsonb not null,       -- snapshot after this period
  calc_meta jsonb not null, -- inputs, frequency, rule version, thresholds
  created_at timestamptz not null default now(),
  unique (run_employee_id)
);
create index if not exists idx_results_company on public.pay_results(company_id);
alter table public.pay_results enable row level security;

-- 5) Minimal employee columns if missing (safe adds)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='tax_code') then
    alter table public.employees add column tax_code text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='tax_basis') then
    alter table public.employees add column tax_basis text; -- 'cumulative' | 'wk1mth1'
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='ni_category') then
    alter table public.employees add column ni_category text; -- 'A','H','M','Z', etc.
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='loan_plan') then
    alter table public.employees add column loan_plan text; -- 'plan1','plan2','plan4','plan5'
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='has_pgl') then
    alter table public.employees add column has_pgl boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='pension_status') then
    alter table public.employees add column pension_status text; -- 'eligible','non-eligible','worker','opted-out'
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='is_director') then
    alter table public.employees add column is_director boolean not null default false;
  end if;

  -- YTD tracking
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='ytd_gross') then
    alter table public.employees add column ytd_gross numeric(12,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='ytd_tax') then
    alter table public.employees add column ytd_tax numeric(12,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='ytd_ni_emp') then
    alter table public.employees add column ytd_ni_emp numeric(12,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='ytd_ni_er') then
    alter table public.employees add column ytd_ni_er numeric(12,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='ytd_pension_emp') then
    alter table public.employees add column ytd_pension_emp numeric(12,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='employees' and column_name='ytd_pension_er') then
    alter table public.employees add column ytd_pension_er numeric(12,2) not null default 0;
  end if;
end $$;

-- 6) RLS policies (uuid-to-uuid comparisons)
do $$
begin
  -- pay_runs
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_runs' and policyname='pay_runs_sel') then
    create policy pay_runs_sel on public.pay_runs for select using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_runs' and policyname='pay_runs_ins') then
    create policy pay_runs_ins on public.pay_runs for insert with check (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_runs' and policyname='pay_runs_upd') then
    create policy pay_runs_upd on public.pay_runs for update using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_runs' and policyname='pay_runs_del') then
    create policy pay_runs_del on public.pay_runs for delete using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;

  -- pay_run_employees
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_sel') then
    create policy pre_sel on public.pay_run_employees for select using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_ins') then
    create policy pre_ins on public.pay_run_employees for insert with check (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_upd') then
    create policy pre_upd on public.pay_run_employees for update using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_del') then
    create policy pre_del on public.pay_run_employees for delete using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;

  -- pay_items
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_items' and policyname='items_sel') then
    create policy items_sel on public.pay_items for select using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_items' and policyname='items_ins') then
    create policy items_ins on public.pay_items for insert with check (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_items' and policyname='items_upd') then
    create policy items_upd on public.pay_items for update using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_items' and policyname='items_del') then
    create policy items_del on public.pay_items for delete using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;

  -- pay_results
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_results' and policyname='results_sel') then
    create policy results_sel on public.pay_results for select using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_results' and policyname='results_ins') then
    create policy results_ins on public.pay_results for insert with check (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
end $$;
