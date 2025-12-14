-- 20250923150000_expand_employee_p45_details.sql
-- Add HMRC fields and keep RLS sane.

-- Ensure base table exists (noop if already created by earlier migration)
create table if not exists public.employee_p45_details (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  company_id  uuid not null,
  employer_name text,
  works_number text,
  tax_code text not null default '1257L',
  tax_basis text not null default 'cumulative',
  prev_pay_to_date numeric(12,2) not null default 0,
  prev_tax_to_date numeric(12,2) not null default 0,
  leaving_date date,
  updated_at timestamptz not null default now()
);

-- New columns if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_p45_details' and column_name='employer_paye_ref'
  ) then
    alter table public.employee_p45_details add column employer_paye_ref text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_p45_details' and column_name='student_loan_deductions'
  ) then
    alter table public.employee_p45_details add column student_loan_deductions boolean not null default false;
  end if;
end $$;

create index if not exists idx_emp_p45_company on public.employee_p45_details(company_id);

-- RLS already enabled in prior migration, but make sure it is
alter table public.employee_p45_details enable row level security;

-- Ensure policies exist and compare uuid-to-uuid
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_p45_details' and policyname = 'p45_sel'
  ) then
    create policy p45_sel on public.employee_p45_details
      for select using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_p45_details' and policyname = 'p45_ins'
  ) then
    create policy p45_ins on public.employee_p45_details
      for insert with check (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_p45_details' and policyname = 'p45_upd'
  ) then
    create policy p45_upd on public.employee_p45_details
      for update using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
end $$;
