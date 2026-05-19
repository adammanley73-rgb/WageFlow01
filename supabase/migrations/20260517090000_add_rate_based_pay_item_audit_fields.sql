alter table public.payroll_run_pay_elements
  add column if not exists calculation_kind text null,
  add column if not exists units numeric(12, 4) null,
  add column if not exists base_rate numeric(12, 4) null,
  add column if not exists rate_multiplier numeric(8, 4) null,
  add column if not exists calculated_rate numeric(12, 4) null,
  add column if not exists manual_override boolean not null default false,
  add column if not exists override_reason text null;

alter table public.payroll_run_pay_elements
  drop constraint if exists payroll_run_pay_elements_calculation_kind_check;

alter table public.payroll_run_pay_elements
  add constraint payroll_run_pay_elements_calculation_kind_check
  check (
    calculation_kind is null
    or calculation_kind in ('manual_amount', 'rate_units')
  );

alter table public.payroll_run_pay_elements
  drop constraint if exists payroll_run_pay_elements_rate_units_check;

alter table public.payroll_run_pay_elements
  add constraint payroll_run_pay_elements_rate_units_check
  check (
    calculation_kind is distinct from 'rate_units'
    or (
      units is not null
      and units > 0
      and base_rate is not null
      and base_rate >= 0
      and rate_multiplier is not null
      and rate_multiplier > 0
      and calculated_rate is not null
      and calculated_rate >= 0
      and amount >= 0
    )
  );

alter table public.payroll_run_pay_elements
  drop constraint if exists payroll_run_pay_elements_manual_override_reason_check;

alter table public.payroll_run_pay_elements
  add constraint payroll_run_pay_elements_manual_override_reason_check
  check (
    manual_override = false
    or nullif(btrim(coalesce(override_reason, '')), '') is not null
  );