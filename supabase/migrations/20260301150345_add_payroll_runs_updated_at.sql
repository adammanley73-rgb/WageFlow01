-- supabase/migrations/20260301150345_add_payroll_runs_updated_at.sql
-- Ensure payroll_runs has updated_at (used by WorkflowService)
alter table public.payroll_runs
add column if not exists updated_at timestamptz not null default now();
