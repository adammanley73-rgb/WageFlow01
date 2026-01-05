-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20260104170000_add_calc_mode_to_run_employees.sql
-- Adds a deterministic calculation state to run-employee rows.
-- Values:
--   uncomputed  = nothing has run yet
--   gross_only  = temporary mode (net=gross, tax/NI=0)
--   full        = PAYE+NI engine populated tax/NI/net properly

do $$
begin
  -- payroll_run_employees (current canonical table)
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'payroll_run_employees'
  ) then
    alter table public.payroll_run_employees
      add column if not exists calc_mode text not null default 'uncomputed';

    alter table public.payroll_run_employees
      drop constraint if exists payroll_run_employees_calc_mode_chk;

    alter table public.payroll_run_employees
      add constraint payroll_run_employees_calc_mode_chk
      check (calc_mode in ('uncomputed', 'gross_only', 'full'));
  end if;

  -- pay_run_employees (legacy table, kept for safety in older environments)
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'pay_run_employees'
  ) then
    alter table public.pay_run_employees
      add column if not exists calc_mode text not null default 'uncomputed';

    alter table public.pay_run_employees
      drop constraint if exists pay_run_employees_calc_mode_chk;

    alter table public.pay_run_employees
      add constraint pay_run_employees_calc_mode_chk
      check (calc_mode in ('uncomputed', 'gross_only', 'full'));
  end if;
end $$;
