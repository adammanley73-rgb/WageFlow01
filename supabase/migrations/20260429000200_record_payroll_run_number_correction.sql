-- C:\Projects\wageflow01\supabase\migrations\20260429000200_record_payroll_run_number_correction.sql
--
-- Purpose:
-- Record the manual correction made on 2026-04-29 after fixing payroll run numbering across UK tax-year boundaries.
--
-- Guarded because Supabase Preview may replay this migration before public.payroll_runs exists.

do $$
begin
  if to_regclass('public.payroll_runs') is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payroll_runs'
      and column_name = 'run_number'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payroll_runs'
      and column_name = 'updated_at'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payroll_runs'
      and column_name = 'frequency'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payroll_runs'
      and column_name = 'pay_period_start'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payroll_runs'
      and column_name = 'pay_period_end'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payroll_runs'
      and column_name = 'period_start'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payroll_runs'
      and column_name = 'period_end'
  ) then
    return;
  end if;

  update public.payroll_runs
  set
    run_number = case
      when id = '43d88e5e-5a55-433f-b657-3054b0e6656c' then 'wk 1'
      when id = 'a5c8f6ce-6169-4367-8aee-f7e235c74d0d' then 'wk 2'
      else run_number
    end,
    updated_at = now()
  where company_id = '9d0aa562-dde9-44be-b7c6-accd4e63e7c1'
    and frequency = 'weekly'
    and (
      (
        id = '43d88e5e-5a55-433f-b657-3054b0e6656c'
        and pay_period_start = date '2026-04-06'
        and pay_period_end = date '2026-04-12'
        and period_start = date '2026-04-06'
        and period_end = date '2026-04-12'
      )
      or
      (
        id = 'a5c8f6ce-6169-4367-8aee-f7e235c74d0d'
        and pay_period_start = date '2026-04-13'
        and pay_period_end = date '2026-04-19'
        and period_start = date '2026-04-13'
        and period_end = date '2026-04-19'
      )
    );
end $$;