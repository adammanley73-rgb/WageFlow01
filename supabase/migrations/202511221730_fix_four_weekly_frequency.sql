-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\202511221730_fix_four_weekly_frequency.sql
-- Guarded because Supabase Preview may replay this migration before public.payroll_runs exists.

do $$
begin
    if to_regclass('public.payroll_runs') is not null then
        alter table public.payroll_runs
        drop constraint if exists payroll_runs_frequency_check;

        if exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'payroll_runs'
              and column_name = 'frequency'
        ) then
            update public.payroll_runs
            set frequency = 'four_weekly'
            where frequency = 'fourweekly';

            alter table public.payroll_runs
            add constraint payroll_runs_frequency_check
            check (frequency in ('weekly', 'fortnightly', 'four_weekly', 'monthly'));
        end if;

        if exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'payroll_runs'
              and column_name = 'pay_frequency'
        ) then
            update public.payroll_runs
            set pay_frequency = 'four_weekly'
            where pay_frequency = 'fourweekly';
        end if;
    end if;

    if to_regclass('public.employees') is not null then
        if exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'employees'
              and column_name = 'pay_frequency'
        ) then
            update public.employees
            set pay_frequency = 'four_weekly'
            where pay_frequency = 'fourweekly';
        end if;
    end if;
end $$;