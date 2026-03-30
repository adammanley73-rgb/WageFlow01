-- C:\Projects\wageflow01\supabase\migrations\20260326190000_add_employee_pension_capture_fields.sql

begin;

alter table public.employees
  add column if not exists pension_scheme_name text,
  add column if not exists pension_reference text,
  add column if not exists pension_contribution_method text,
  add column if not exists pension_earnings_basis text,
  add column if not exists pension_employee_rate numeric(7,4),
  add column if not exists pension_employer_rate numeric(7,4),
  add column if not exists pension_enrolment_date date,
  add column if not exists pension_opt_in_date date,
  add column if not exists pension_opt_out_date date,
  add column if not exists pension_postponement_end_date date,
  add column if not exists pension_worker_category text;

update public.employees
set pension_status = 'not_assessed'
where pension_status is null
   or btrim(pension_status) = '';

alter table public.employees
  alter column pension_status set default 'not_assessed';

comment on column public.employees.pension_status is 'Employee pension status for onboarding and payroll capture, e.g. not_assessed, postponed, enrolled, opted_out, ceased, not_eligible.';
comment on column public.employees.pension_scheme_name is 'Free-text pension scheme name until scheme master data exists.';
comment on column public.employees.pension_reference is 'Optional pension provider or payroll reference for the employee.';
comment on column public.employees.pension_contribution_method is 'Contribution method: relief_at_source, net_pay, or salary_sacrifice.';
comment on column public.employees.pension_earnings_basis is 'Basis for pension deductions: qualifying_earnings, pensionable_pay, or basic_pay.';
comment on column public.employees.pension_employee_rate is 'Employee pension contribution percentage.';
comment on column public.employees.pension_employer_rate is 'Employer pension contribution percentage.';
comment on column public.employees.pension_enrolment_date is 'Date employee joined the pension scheme.';
comment on column public.employees.pension_opt_in_date is 'Date employee opted in.';
comment on column public.employees.pension_opt_out_date is 'Date employee opted out.';
comment on column public.employees.pension_postponement_end_date is 'End date of any AE postponement period.';
comment on column public.employees.pension_worker_category is 'Optional worker category such as eligible_jobholder, non_eligible_jobholder, or entitled_worker.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_pension_contribution_method_check'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_pension_contribution_method_check
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
    where conname = 'employees_pension_earnings_basis_check'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_pension_earnings_basis_check
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
    where conname = 'employees_pension_employee_rate_check'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_pension_employee_rate_check
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
    where conname = 'employees_pension_employer_rate_check'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_pension_employer_rate_check
      check (
        pension_employer_rate is null
        or (pension_employer_rate >= 0 and pension_employer_rate <= 100)
      );
  end if;
end
$$;

commit;