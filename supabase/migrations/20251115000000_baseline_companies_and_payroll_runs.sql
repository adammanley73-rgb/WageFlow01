-- 20251115000000_baseline_companies_and_payroll_runs.sql
-- Purpose:
-- Fresh demo databases have no core tables because early "remote_applied_placeholder" migrations are empty.
-- This baseline creates the minimum required core tables so subsequent migrations that ALTER payroll_runs can run.
-- Design rules:
-- - Use IF NOT EXISTS for idempotency on environments where tables already exist.
-- - Keep columns minimal. Later migrations add additional columns, triggers, constraints.
-- - Ensure pgcrypto is available (gen_random_uuid).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- public.companies (minimum viable)
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.companies is 'Tenant companies (baseline). Additional columns added by later migrations.';

-- Basic updated_at helper (safe to create once)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_companies_set_updated_at on public.companies;
create trigger trg_companies_set_updated_at
before update on public.companies
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- public.payroll_runs (minimum viable)
-- ---------------------------------------------------------------------------
create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payroll_runs is 'Payroll runs (baseline). Additional columns/constraints added by later migrations.';

drop trigger if exists trg_payroll_runs_set_updated_at on public.payroll_runs;
create trigger trg_payroll_runs_set_updated_at
before update on public.payroll_runs
for each row
execute function public.set_updated_at();

create index if not exists idx_payroll_runs_company_id on public.payroll_runs(company_id);
