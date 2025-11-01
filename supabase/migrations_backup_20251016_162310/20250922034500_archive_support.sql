-- Archive support for payroll runs
-- Adds archived_at column if not already present
-- Provides partial index for active runs

alter table public.payroll_runs
  add column if not exists archived_at timestamptz;

-- Index to quickly filter active runs
create index if not exists idx_payroll_runs_active
on public.payroll_runs(company_id, period_start)
where archived_at is null;

comment on column public.payroll_runs.archived_at is
'Timestamp when the payroll run was archived. Null = active.';
