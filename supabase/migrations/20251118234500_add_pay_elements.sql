-- 20251118234500_add_pay_elements.sql
-- Add master pay element types and per-run pay elements

begin;

-- 1) Master table: pay_element_types
create table if not exists public.pay_element_types (
  id uuid primary key default gen_random_uuid(),

  -- Optional: tie an element type to a specific company.
  -- If null, it is a global/default type.
  company_id uuid references public.companies(id) on delete cascade,

  -- Short code used in the app, e.g. BASIC, OT15, BONUS
  code text not null,

  -- Human-readable name, e.g. 'Basic pay', 'Overtime 1.5x'
  name text not null,

  -- 'earning' or 'deduction'
  side text not null check (side in ('earning','deduction')),

  -- Default flags for how this element behaves in calculations
  taxable_for_paye boolean not null default true,
  nic_earnings boolean not null default true,
  pensionable_default boolean not null default true,
  ae_qualifying_default boolean not null default true,

  -- Mark elements that represent salary sacrifice-style flows
  is_salary_sacrifice_type boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure we do not accidentally duplicate codes within the same company.
-- For global types, company_id is null, so we coalesce it to a dummy UUID
-- to keep uniqueness consistent.
create unique index if not exists pay_element_types_company_code_uniq
on public.pay_element_types (
  coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
  code
);

-- 2) Transaction table: payroll_run_pay_elements
create table if not exists public.payroll_run_pay_elements (
  id uuid primary key default gen_random_uuid(),

  -- Link to the specific employee entry within a run
  payroll_run_employee_id uuid not null
    references public.payroll_run_employees(id)
    on delete cascade,

  -- What kind of element is this? (basic pay, overtime, loan deduction, etc)
  pay_element_type_id uuid not null
    references public.pay_element_types(id),

  -- Optional override text to show on the payslip instead of the master name
  description_override text,

  -- Positive amount in GBP
  amount numeric(12,2) not null,

  -- Optional overrides for the default flags from pay_element_types
  taxable_for_paye_override boolean,
  nic_earnings_override boolean,
  pensionable_override boolean,
  ae_qualifying_override boolean,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payroll_run_pay_elements_pr_employee_id_idx
  on public.payroll_run_pay_elements (payroll_run_employee_id);

create index if not exists payroll_run_pay_elements_element_type_idx
  on public.payroll_run_pay_elements (pay_element_type_id);

commit;
