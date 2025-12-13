BEGIN;

-- 1) Master table for pay element types
create table if not exists public.pay_element_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  side text not null check (side in ('earning', 'deduction')),
  taxable_for_paye boolean not null default true,
  nic_earnings boolean not null default true,
  pensionable_default boolean not null default false,
  ae_qualifying_default boolean not null default false,
  is_salary_sacrifice_type boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Instance table for pay elements on a specific payroll_run_employee
create table if not exists public.payroll_run_pay_elements (
  id uuid primary key default gen_random_uuid(),
  payroll_run_employee_id uuid not null
    references public.payroll_run_employees(id) on delete cascade,
  pay_element_type_id uuid not null
    references public.pay_element_types(id),
  amount numeric(12,2) not null,
  taxable_for_paye_override boolean,
  nic_earnings_override boolean,
  pensionable_override boolean,
  ae_qualifying_override boolean,
  description_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payroll_run_pay_elements_employee_id
  on public.payroll_run_pay_elements (payroll_run_employee_id);

create index if not exists idx_payroll_run_pay_elements_type_id
  on public.payroll_run_pay_elements (pay_element_type_id);

-- 3) Generic updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop and recreate triggers so we know they exist and are correct
drop trigger if exists handle_updated_at_pay_element_types
  on public.pay_element_types;

create trigger handle_updated_at_pay_element_types
  before update on public.pay_element_types
  for each row
  execute function public.handle_updated_at();

drop trigger if exists handle_updated_at_payroll_run_pay_elements
  on public.payroll_run_pay_elements;

create trigger handle_updated_at_payroll_run_pay_elements
  before update on public.payroll_run_pay_elements
  for each row
  execute function public.handle_updated_at();

-- 4) Enable RLS (service role bypasses this)
alter table public.pay_element_types enable row level security;
alter table public.payroll_run_pay_elements enable row level security;

-- 5) Seed a standard set of pay element types (only if table is currently empty)
insert into public.pay_element_types (
  code,
  name,
  side,
  taxable_for_paye,
  nic_earnings,
  pensionable_default,
  ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  code,
  name,
  side,
  taxable_for_paye,
  nic_earnings,
  pensionable_default,
  ae_qualifying_default,
  is_salary_sacrifice_type
from (
  values
    -- Earnings
    ('BASIC',   'Basic pay',                          'earning',  true,  true,  true,  true,  false),
    ('OT',      'Overtime',                           'earning',  true,  true,  true,  true,  false),
    ('BONUS',   'Bonus',                              'earning',  true,  true,  true,  true,  false),
    ('COMM',    'Commission',                         'earning',  true,  true,  true,  true,  false),
    ('HOL',     'Annual leave pay',                   'earning',  true,  true,  true,  true,  false),
    ('SSP',     'Statutory Sick Pay',                 'earning',  true,  true,  false, false, false),
    ('SMP',     'Statutory Maternity Pay',            'earning',  true,  true,  false, false, false),
    ('SPP',     'Statutory Paternity Pay',            'earning',  true,  true,  false, false, false),
    ('SAP',     'Statutory Adoption Pay',             'earning',  true,  true,  false, false, false),
    ('SHPP',    'Shared Parental Pay',                'earning',  true,  true,  false, false, false),
    ('SPBP',    'Statutory Parental Bereavement Pay', 'earning',  true,  true,  false, false, false),
    ('SNCP',    'Statutory Neonatal Care Pay',        'earning',  true,  true,  false, false, false),

    -- Deductions (employee side)
    ('PAYE',          'PAYE income tax',                         'deduction', false, false, false, false, false),
    ('EE_NI',         'Employee National Insurance',             'deduction', false, false, false, false, false),
    ('EE_PEN',        'Employee pension contribution',           'deduction', false, false, true,  true,  false),
    ('EE_PEN_RAS',    'Employee pension (relief at source)',     'deduction', false, false, true,  true,  false),
    ('EE_PEN_SAL_SAC','Employee pension (salary sacrifice)',     'deduction', false, false, true,  true,  true),
    ('AEO',           'Attachment of earnings order',            'deduction', false, false, false, false, false),
    ('SL_P1',         'Student loan Plan 1',                     'deduction', false, false, false, false, false),
    ('SL_P2',         'Student loan Plan 2',                     'deduction', false, false, false, false, false),
    ('SL_P4',         'Student loan Plan 4',                     'deduction', false, false, false, false, false),
    ('SL_P5',         'Student loan Plan 5',                     'deduction', false, false, false, false, false),
    ('PGL',           'Postgraduate loan',                       'deduction', false, false, false, false, false),

    -- Deductions tagged as employer-type costs for reporting
    -- Net pay logic will decide whether to include these in employee net or not.
    ('ER_NI',   'Employer National Insurance',       'deduction', false, false, false, false, false),
    ('ER_PEN',  'Employer pension contribution',     'deduction', false, false, true,  true,  false)
) as seed(
  code,
  name,
  side,
  taxable_for_paye,
  nic_earnings,
  pensionable_default,
  ae_qualifying_default,
  is_salary_sacrifice_type
)
where not exists (
  select 1 from public.pay_element_types
);

COMMIT;
