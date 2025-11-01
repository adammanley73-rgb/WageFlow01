-- 20250924093000_payroll_core_repair.sql
-- Bring existing tables up to the core schema shape. Safe, idempotent.

-- Helper: does a column exist?
create or replace function public._col_exists(p_schema text, p_table text, p_column text)
returns boolean language sql stable as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema=p_schema and table_name=p_table and column_name=p_column
  );
$$;

-- 1) pay_runs: add company_id if missing, enable RLS, policies, indexes
do $$
begin
  if not public._col_exists('public','pay_runs','company_id') then
    alter table public.pay_runs add column company_id uuid;
  end if;
exception when undefined_table then
  -- If the table somehow doesn't exist, create it minimal and continue
  create table public.pay_runs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid,
    frequency text not null check (frequency in ('weekly','fortnightly','fourweekly','monthly')),
    period_start date not null,
    period_end date not null,
    pay_date date not null,
    status text not null default 'draft' check (status in ('draft','posted','void')),
    created_at timestamptz not null default now()
  );
end $$;

create index if not exists idx_pay_runs_company on public.pay_runs(company_id);
create index if not exists idx_pay_runs_status on public.pay_runs(status);
alter table public.pay_runs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_runs' and policyname='pay_runs_sel') then
    create policy pay_runs_sel on public.pay_runs
      for select using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_runs' and policyname='pay_runs_ins') then
    create policy pay_runs_ins on public.pay_runs
      for insert with check (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_runs' and policyname='pay_runs_upd') then
    create policy pay_runs_upd on public.pay_runs
      for update using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_runs' and policyname='pay_runs_del') then
    create policy pay_runs_del on public.pay_runs
      for delete using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
end $$;

-- 2) pay_run_employees: add company_id if missing, indexes, RLS, policies
do $$
begin
  if not public._col_exists('public','pay_run_employees','company_id') then
    alter table public.pay_run_employees add column company_id uuid;
  end if;
  if not public._col_exists('public','pay_run_employees','status') then
    alter table public.pay_run_employees add column status text not null default 'pending'
      check (status in ('pending','calculated','posted'));
  end if;
exception when undefined_table then
  create table public.pay_run_employees (
    id uuid primary key default gen_random_uuid(),
    pay_run_id uuid not null references public.pay_runs(id) on delete cascade,
    employee_id uuid not null references public.employees(id) on delete restrict,
    company_id uuid,
    status text not null default 'pending' check (status in ('pending','calculated','posted')),
    created_at timestamptz not null default now(),
    unique (pay_run_id, employee_id)
  );
end $$;

create index if not exists idx_pre_run on public.pay_run_employees(pay_run_id);
create index if not exists idx_pre_emp on public.pay_run_employees(employee_id);
create index if not exists idx_pre_company on public.pay_run_employees(company_id);
alter table public.pay_run_employees enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_sel') then
    create policy pre_sel on public.pay_run_employees
      for select using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_ins') then
    create policy pre_ins on public.pay_run_employees
      for insert with check (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_upd') then
    create policy pre_upd on public.pay_run_employees
      for update using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_del') then
    create policy pre_del on public.pay_run_employees
      for delete using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
end $$;

-- 3) pay_items: add company_id if missing, indexes, RLS, policies
do $$
begin
  if not public._col_exists('public','pay_items','company_id') then
    alter table public.pay_items add column company_id uuid;
  end if;
exception when undefined_table then
  create table public.pay_items (
    id uuid primary key default gen_random_uuid(),
    run_employee_id uuid not null references public.pay_run_employees(id) on delete cascade,
    company_id uuid,
    type text not null,
    amount numeric(12,2) not null,
    qty numeric(12,3),
    meta jsonb,
    created_at timestamptz not null default now()
  );
end $$;

create index if not exists idx_items_run_emp on public.pay_items(run_employee_id);
create index if not exists idx_items_company on public.pay_items(company_id);
alter table public.pay_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_items' and policyname='items_sel') then
    create policy items_sel on public.pay_items
      for select using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_items' and policyname='items_ins') then
    create policy items_ins on public.pay_items
      for insert with check (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_items' and policyname='items_upd') then
    create policy items_upd on public.pay_items
      for update using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_items' and policyname='items_del') then
    create policy items_del on public.pay_items
      for delete using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
end $$;

-- 4) pay_results: add company_id if missing, indexes, RLS, policies
do $$
begin
  if not public._col_exists('public','pay_results','company_id') then
    alter table public.pay_results add column company_id uuid;
  end if;
exception when undefined_table then
  create table public.pay_results (
    id uuid primary key default gen_random_uuid(),
    run_employee_id uuid not null references public.pay_run_employees(id) on delete cascade,
    company_id uuid,
    lines jsonb not null,
    totals jsonb not null,
    ytd jsonb not null,
    calc_meta jsonb not null,
    created_at timestamptz not null default now(),
    unique (run_employee_id)
  );
end $$;

create index if not exists idx_results_company on public.pay_results(company_id);
alter table public.pay_results enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_results' and policyname='results_sel') then
    create policy results_sel on public.pay_results
      for select using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_results' and policyname='results_ins') then
    create policy results_ins on public.pay_results
      for insert with check (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
end $$;

-- Cleanup helper
drop function if exists public._col_exists(p_schema text, p_table text, p_column text);
