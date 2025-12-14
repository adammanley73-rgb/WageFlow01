BEGIN;

-- Drop the old dev table so we can align it with the new API expectations
drop table if exists public.payroll_run_pay_elements cascade;

-- Recreate with the schema the API is written against
create table public.payroll_run_pay_elements (
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

-- Generic updated_at trigger function (safe to redefine)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Ensure updated_at gets maintained for this table
drop trigger if exists handle_updated_at_payroll_run_pay_elements
  on public.payroll_run_pay_elements;

create trigger handle_updated_at_payroll_run_pay_elements
  before update on public.payroll_run_pay_elements
  for each row
  execute function public.handle_updated_at();

-- RLS on (service role bypasses this)
alter table public.payroll_run_pay_elements enable row level security;

COMMIT;
