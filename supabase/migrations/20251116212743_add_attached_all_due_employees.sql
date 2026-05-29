-- Add attached_all_due_employees flag to payroll_runs
-- Purpose:
-- - Track user-confirmed "all due employees are attached" state
-- - Default to false for all existing and new runs
-- Guarded because Supabase Preview may replay this migration before public.payroll_runs exists.

do $$
begin
  if to_regclass('public.payroll_runs') is not null then
    execute 'alter table public.payroll_runs add column if not exists attached_all_due_employees boolean not null default false';
    execute 'comment on column public.payroll_runs.attached_all_due_employees is ''User-confirmed flag showing that all employees due for payment have been attached to this payroll run.''';
  end if;
end $$;
