-- C:\Projects\wageflow01\supabase\migrations\20260411100000_add_contract_level_pension_fields.sql
-- Add contract-level pension fields so each employee contract can carry its own pension setup.

begin;

alter table public.employee_contracts
  add column if not exists pension_enabled boolean,
  add column if not exists pension_status text,
  add column if not exists pension_scheme_name text,
  add column if not exists pension_reference text,
  add column if not exists pension_contribution_method text,
  add column if not exists pension_earnings_basis text,
  add column if not exists pension_employee_rate numeric(7,4),
  add column if not exists pension_employer_rate numeric(7,4),
  add column if not exists pension_worker_category text,
  add column if not exists pension_enrolment_date date,
  add column if not exists pension_opt_in_date date,
  add column if not exists pension_opt_out_date date,
  add column if not exists pension_postponement_date date;

update public.employee_contracts
set
  pension_enabled = coalesce(pension_enabled, false),
  pension_status = coalesce(nullif(btrim(pension_status), ''), 'not_assessed');

alter table public.employee_contracts
  alter column pension_enabled set default false;

alter table public.employee_contracts
  alter column pension_status set default 'not_assessed';

comment on column public.employee_contracts.pension_enabled is 'True when this specific contract participates in pension assessment and calculation.';
comment on column public.employee_contracts.pension_status is 'Contract-level pension status, e.g. not_assessed, postponed, eligible, enrolled, opted_in, opted_out, ceased, not_eligible.';
comment on column public.employee_contracts.pension_scheme_name is 'Free-text pension scheme name for this contract.';
comment on column public.employee_contracts.pension_reference is 'Optional pension provider or payroll reference for this contract.';
comment on column public.employee_contracts.pension_contribution_method is 'Contribution method for this contract: relief_at_source, net_pay, or salary_sacrifice.';
comment on column public.employee_contracts.pension_earnings_basis is 'Basis for pension deductions on this contract: qualifying_earnings, pensionable_pay, or basic_pay.';
comment on column public.employee_contracts.pension_employee_rate is 'Employee pension contribution percentage for this contract.';
comment on column public.employee_contracts.pension_employer_rate is 'Employer pension contribution percentage for this contract.';
comment on column public.employee_contracts.pension_worker_category is 'Optional worker category for this contract such as eligible_jobholder, non_eligible_jobholder, or entitled_worker.';
comment on column public.employee_contracts.pension_enrolment_date is 'Date this contract joined the pension scheme.';
comment on column public.employee_contracts.pension_opt_in_date is 'Date this contract opted in.';
comment on column public.employee_contracts.pension_opt_out_date is 'Date this contract opted out.';
comment on column public.employee_contracts.pension_postponement_date is 'End date of any AE postponement period for this contract.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_contracts_pension_status_check'
      and conrelid = 'public.employee_contracts'::regclass
  ) then
    alter table public.employee_contracts
      add constraint employee_contracts_pension_status_check
      check (
        pension_status is null
        or pension_status in (
          'not_assessed',
          'postponed',
          'eligible',
          'enrolled',
          'opted_in',
          'opted_out',
          'ceased',
          'not_eligible'
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_contracts_pension_contribution_method_check'
      and conrelid = 'public.employee_contracts'::regclass
  ) then
    alter table public.employee_contracts
      add constraint employee_contracts_pension_contribution_method_check
      check (
        pension_contribution_method is null
        or pension_contribution_method in ('relief_at_source', 'net_pay', 'salary_sacrifice')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_contracts_pension_earnings_basis_check'
      and conrelid = 'public.employee_contracts'::regclass
  ) then
    alter table public.employee_contracts
      add constraint employee_contracts_pension_earnings_basis_check
      check (
        pension_earnings_basis is null
        or pension_earnings_basis in ('qualifying_earnings', 'pensionable_pay', 'basic_pay')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_contracts_pension_employee_rate_check'
      and conrelid = 'public.employee_contracts'::regclass
  ) then
    alter table public.employee_contracts
      add constraint employee_contracts_pension_employee_rate_check
      check (
        pension_employee_rate is null
        or (pension_employee_rate >= 0 and pension_employee_rate <= 100)
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_contracts_pension_employer_rate_check'
      and conrelid = 'public.employee_contracts'::regclass
  ) then
    alter table public.employee_contracts
      add constraint employee_contracts_pension_employer_rate_check
      check (
        pension_employer_rate is null
        or (pension_employer_rate >= 0 and pension_employer_rate <= 100)
      );
  end if;
end
$$;

create index if not exists idx_employee_contracts_company_pension_enabled
  on public.employee_contracts (company_id, pension_enabled);

create index if not exists idx_employee_contracts_company_pension_status
  on public.employee_contracts (company_id, pension_status);

commit;