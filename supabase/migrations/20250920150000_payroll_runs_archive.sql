-- 20250920150000_payroll_runs_archive.sql
-- Add archive capability for payroll runs without moving data.

-- 1) Column to mark a run as archived (timestamp for auditability)
ALTER TABLE public.payroll_runs
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 2) Helpful partial indexes
-- Active runs: fast filtering and ordering by period_start for the main page
CREATE INDEX IF NOT EXISTS ix_payroll_runs_active_company_freq_start
  ON public.payroll_runs(company_id, frequency, period_start)
  WHERE archived_at IS NULL;

-- Archived runs: fast filtering for the archive page
CREATE INDEX IF NOT EXISTS ix_payroll_runs_archived_company_start
  ON public.payroll_runs(company_id, period_start)
  WHERE archived_at IS NOT NULL;

-- 3) Optional safety: you generally shouldn’t archive a run that has no period_end.
-- We’ll keep this advisory only (no CHECK) to avoid blocking legacy data.
-- If you want a hard rule later:
-- ALTER TABLE public.payroll_runs
--   ADD CONSTRAINT chk_archive_after_period
--   CHECK (archived_at IS NULL OR period_end IS NOT NULL);

-- 4) No data changes here. UI will control when to set archived_at.
