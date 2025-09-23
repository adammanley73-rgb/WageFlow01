-- supabase/01_schema.sql

-- Companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Map auth users to a company
create table if not exists public.user_company_memberships (
  user_id uuid not null,          -- auth.users.id
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

-- Pay schedules per company
create table if not exists public.pay_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,         -- e.g. monthly_salaried
  label text not null,        -- e.g. Monthly salaried
  frequency text not null,    -- monthly, weekly, fourweekly, fortnightly
  created_at timestamptz not null default now()
);
create index if not exists idx_pay_schedules_company on public.pay_schedules(company_id);

-- Employees per company
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  ni text not null,                 -- stored uppercase, no spaces
  pay_group text not null,          -- matches your UI codes
  hourly_rate numeric(10,2),
  annual_salary numeric(12,2),
  weekly_hours numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_employees_company on public.employees(company_id);
create index if not exists idx_employees_ni on public.employees(ni);

-- Simple view for counts
create or replace view public.employee_counts_by_company as
  select company_id, count(*)::int as total
  from public.employees
  group by company_id;
