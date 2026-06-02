create table if not exists public.payroll_recovery_employee_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  employee_id uuid not null,
  recovery_mode text not null default 'full_available',
  fixed_amount_per_run numeric(12,2),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint payroll_recovery_employee_plans_mode_check check (
    recovery_mode in (
      'full_available',
      'fixed_total_per_run',
      'fixed_per_balance_per_run',
      'hold'
    )
  ),
  constraint payroll_recovery_employee_plans_amount_check check (
    fixed_amount_per_run is null
    or fixed_amount_per_run > 0
  )
);

create unique index if not exists payroll_recovery_employee_plans_company_employee_unique
on public.payroll_recovery_employee_plans (company_id, employee_id);

create index if not exists payroll_recovery_employee_plans_company_mode_idx
on public.payroll_recovery_employee_plans (company_id, recovery_mode);

create or replace function public.set_payroll_recovery_employee_plan_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_payroll_recovery_employee_plan_updated_at
on public.payroll_recovery_employee_plans;

create trigger set_payroll_recovery_employee_plan_updated_at
before update on public.payroll_recovery_employee_plans
for each row
execute function public.set_payroll_recovery_employee_plan_updated_at();

alter table public.payroll_recovery_employee_plans enable row level security;

drop policy if exists payroll_recovery_employee_plans_select_company_member
on public.payroll_recovery_employee_plans;

create policy payroll_recovery_employee_plans_select_company_member
on public.payroll_recovery_employee_plans
for select
to authenticated
using (public.is_payroll_recovery_company_member(company_id));

drop policy if exists payroll_recovery_employee_plans_insert_company_member
on public.payroll_recovery_employee_plans;

create policy payroll_recovery_employee_plans_insert_company_member
on public.payroll_recovery_employee_plans
for insert
to authenticated
with check (public.is_payroll_recovery_company_member(company_id));

drop policy if exists payroll_recovery_employee_plans_update_company_member
on public.payroll_recovery_employee_plans;

create policy payroll_recovery_employee_plans_update_company_member
on public.payroll_recovery_employee_plans
for update
to authenticated
using (public.is_payroll_recovery_company_member(company_id))
with check (public.is_payroll_recovery_company_member(company_id));
