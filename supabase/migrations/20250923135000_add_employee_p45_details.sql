-- 20250923135000_add_employee_p45_details.sql
-- Create table and correct RLS using a uuid-cast of the JWT company_id.

create table if not exists public.employee_p45_details (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  company_id  uuid not null,
  employer_name text,
  works_number text,
  tax_code text not null default '1257L',
  tax_basis text not null default 'cumulative', -- cumulative | wk1mth1 | BR | D0 | D1 | NT
  prev_pay_to_date numeric(12,2) not null default 0,
  prev_tax_to_date numeric(12,2) not null default 0,
  leaving_date date,
  updated_at timestamptz not null default now()
);

create index if not exists idx_emp_p45_company on public.employee_p45_details(company_id);

alter table public.employee_p45_details enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_p45_details' and policyname = 'p45_sel'
  ) then
    create policy p45_sel on public.employee_p45_details
      for select
      using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_p45_details' and policyname = 'p45_ins'
  ) then
    create policy p45_ins on public.employee_p45_details
      for insert
      with check (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_p45_details' and policyname = 'p45_upd'
  ) then
    create policy p45_upd on public.employee_p45_details
      for update
      using (company_id = (auth.jwt()->>'company_id')::uuid);
  end if;
end $$;
