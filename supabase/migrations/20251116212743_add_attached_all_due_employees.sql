-- Add attached_all_due_employees flag to payroll_runs
-- Purpose:
-- - Track user-confirmed "all due employees are attached" state
-- - Default to false for all existing and new runs

alter table public.payroll_runs
add column if not exists attached_all_due_employees boolean not null default false;

comment on column public.payroll_runs.attached_all_due_employees is
'True when all employees due for payment for this run''s frequency are attached and the user has confirmed this.';