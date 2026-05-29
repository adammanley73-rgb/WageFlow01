-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20260103233000_add_pay_date_override_reason.sql
-- Guarded because Supabase Preview may replay this migration before public.payroll_runs exists.

do $$
begin
  if to_regclass('public.payroll_runs') is not null then
    alter table public.payroll_runs
    add column if not exists pay_date_override_reason text;
  end if;
end $$;