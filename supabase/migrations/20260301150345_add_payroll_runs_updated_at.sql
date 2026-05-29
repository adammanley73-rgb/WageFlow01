-- supabase/migrations/20260301150345_add_payroll_runs_updated_at.sql
-- Ensure payroll_runs has updated_at (used by WorkflowService)
-- Guarded because Supabase Preview may replay this migration before public.payroll_runs exists.

do $$
begin
  if to_regclass('public.payroll_runs') is not null then
    alter table public.payroll_runs
    add column if not exists updated_at timestamptz not null default now();
  end if;
end $$;