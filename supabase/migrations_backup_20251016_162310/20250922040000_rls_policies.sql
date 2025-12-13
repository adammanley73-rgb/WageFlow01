-- Enable RLS and apply company_id scoping on relevant tables

-- Helper to compare company_id (uuid) to JWT claim (text); NULL-safe
create or replace function public.claim_company_id()
returns text
language sql
stable
as $$
  select current_setting('request.jwt.claims.company_id', true)
$$;

-- Employees
alter table if exists public.employees enable row level security;

drop policy if exists employees_company_select on public.employees;
drop policy if exists employees_company_modify on public.employees;

create policy employees_company_select
on public.employees
for select
using (company_id::text = public.claim_company_id());

create policy employees_company_modify
on public.employees
for all
using (company_id::text = public.claim_company_id())
with check (company_id::text = public.claim_company_id());

-- Starter details
alter table if exists public.employee_starter_details enable row level security;

drop policy if exists starter_company_select on public.employee_starter_details;
drop policy if exists starter_company_modify on public.employee_starter_details;

create policy starter_company_select
on public.employee_starter_details
for select
using (company_id::text = public.claim_company_id());

create policy starter_company_modify
on public.employee_starter_details
for all
using (company_id::text = public.claim_company_id())
with check (company_id::text = public.claim_company_id());

-- Bank accounts
alter table if exists public.employee_bank_accounts enable row level security;

drop policy if exists bank_company_select on public.employee_bank_accounts;
drop policy if exists bank_company_modify on public.employee_bank_accounts;

create policy bank_company_select
on public.employee_bank_accounts
for select
using (company_id::text = public.claim_company_id());

create policy bank_company_modify
on public.employee_bank_accounts
for all
using (company_id::text = public.claim_company_id())
with check (company_id::text = public.claim_company_id());

-- Emergency contacts
alter table if exists public.employee_emergency_contacts enable row level security;

drop policy if exists emergency_company_select on public.employee_emergency_contacts;
drop policy if exists emergency_company_modify on public.employee_emergency_contacts;

create policy emergency_company_select
on public.employee_emergency_contacts
for select
using (company_id::text = public.claim_company_id());

create policy emergency_company_modify
on public.employee_emergency_contacts
for all
using (company_id::text = public.claim_company_id())
with check (company_id::text = public.claim_company_id());

-- Payroll runs
alter table if exists public.payroll_runs enable row level security;

drop policy if exists runs_company_select on public.payroll_runs;
drop policy if exists runs_company_modify on public.payroll_runs;

create policy runs_company_select
on public.payroll_runs
for select
using (company_id::text = public.claim_company_id());

create policy runs_company_modify
on public.payroll_runs
for all
using (company_id::text = public.claim_company_id())
with check (company_id::text = public.claim_company_id());

-- Pay run employees
alter table if exists public.pay_run_employees enable row level security;

drop policy if exists pre_company_select on public.pay_run_employees;
drop policy if exists pre_company_modify on public.pay_run_employees;

create policy pre_company_select
on public.pay_run_employees
for select
using (company_id::text = public.claim_company_id());

create policy pre_company_modify
on public.pay_run_employees
for all
using (company_id::text = public.claim_company_id())
with check (company_id::text = public.claim_company_id());
