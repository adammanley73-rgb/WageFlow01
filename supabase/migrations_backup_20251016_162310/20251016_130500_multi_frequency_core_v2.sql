-- 20251016_130500_multi_frequency_core_v2.sql
-- Multi-frequency payroll core with correct, per-command RLS policies

-- 0) Safety: required base tables assumed to exist:
-- companies(id uuid), employees(id uuid, company_id uuid)
-- company_memberships(company_id uuid, user_id uuid, role text)

-- 1) Enum for pay frequency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pay_frequency') THEN
    CREATE TYPE pay_frequency AS ENUM ('monthly','weekly','fortnightly','four_weekly','lunar');
  END IF;
END$$;

-- 2) Utility schema
CREATE SCHEMA IF NOT EXISTS wf_util;

-- 3) Period boundaries helper
CREATE OR REPLACE FUNCTION wf_util.calc_period_bounds(
  p_frequency pay_frequency,
  p_pay_date date
) RETURNS TABLE(period_start date, period_end date)
LANGUAGE plpgsql AS $$
BEGIN
  IF p_frequency = 'monthly' THEN
    period_start := date_trunc('month', p_pay_date)::date;
    period_end   := (date_trunc('month', p_pay_date) + interval '1 month - 1 day')::date;
    RETURN;
  END IF;

  IF p_frequency = 'weekly' THEN
    period_end   := p_pay_date;
    period_start := p_pay_date - interval '6 days';
    RETURN;
  END IF;

  IF p_frequency = 'fortnightly' THEN
    period_end   := p_pay_date;
    period_start := p_pay_date - interval '13 days';
    RETURN;
  END IF;

  IF p_frequency = 'four_weekly' THEN
    period_end   := p_pay_date;
    period_start := p_pay_date - interval '27 days';
    RETURN;
  END IF;

  IF p_frequency = 'lunar' THEN
    period_end   := p_pay_date;
    period_start := p_pay_date - interval '27 days';
    RETURN;
  END IF;

  RAISE EXCEPTION 'Unsupported frequency %', p_frequency;
END
$$;

-- 4) HMRC tax year and week helpers
CREATE OR REPLACE FUNCTION wf_util.hmrc_tax_year(d date) RETURNS int
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  start_this_year date := make_date(EXTRACT(YEAR FROM d)::int,4,6);
BEGIN
  IF d < start_this_year THEN
    RETURN EXTRACT(YEAR FROM d)::int - 1;
  ELSE
    RETURN EXTRACT(YEAR FROM d)::int;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION wf_util.hmrc_tax_week(d date) RETURNS int
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  tax_year_start date;
BEGIN
  tax_year_start := make_date(EXTRACT(YEAR FROM d)::int,4,6);
  IF d < tax_year_start THEN
    tax_year_start := make_date(EXTRACT(YEAR FROM d)::int - 1,4,6);
  END IF;
  RETURN ((d - tax_year_start) / 7) + 1;
END
$$;

-- 5) Payroll runs
CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  frequency pay_frequency NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date NOT NULL,
  tax_year int GENERATED ALWAYS AS (wf_util.hmrc_tax_year(pay_date)) STORED,
  tax_week int GENERATED ALWAYS AS (wf_util.hmrc_tax_week(pay_date)) STORED,
  status text NOT NULL DEFAULT 'draft', -- draft, processing, approved, rti_submitted, completed
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz NULL,
  CONSTRAINT uq_run_unique UNIQUE (company_id, frequency, period_start, period_end, pay_date),
  CONSTRAINT ck_dates_valid CHECK (period_start <= period_end AND pay_date >= period_start AND pay_date <= period_end)
);

-- 6) Payroll run employees
CREATE TABLE IF NOT EXISTS payroll_run_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL,
  gross_pay numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  ni_employee numeric(12,2) NOT NULL DEFAULT 0,
  ni_employer numeric(12,2) NOT NULL DEFAULT 0,
  pension_employee numeric(12,2) NOT NULL DEFAULT 0,
  pension_employer numeric(12,2) NOT NULL DEFAULT 0,
  net_pay numeric(12,2) NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_prep_company_match FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- 7) Company match trigger
CREATE OR REPLACE FUNCTION wf_util.enforce_run_company_match() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE parent_company uuid;
BEGIN
  SELECT company_id INTO parent_company FROM payroll_runs WHERE id = NEW.run_id;
  IF parent_company IS NULL THEN
    RAISE EXCEPTION 'Run % not found', NEW.run_id;
  END IF;
  IF NEW.company_id IS DISTINCT FROM parent_company THEN
    RAISE EXCEPTION 'Line item company_id % must match parent run company_id %', NEW.company_id, parent_company;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_run_item_company_match ON payroll_run_employees;
CREATE TRIGGER trg_run_item_company_match
BEFORE INSERT OR UPDATE ON payroll_run_employees
FOR EACH ROW EXECUTE FUNCTION wf_util.enforce_run_company_match();

-- 8) Safe RPC to create runs
CREATE OR REPLACE FUNCTION wf_util.create_payroll_run(
  p_company_id uuid,
  p_frequency pay_frequency,
  p_pay_date date,
  p_created_by uuid
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  s date; e date; new_id uuid;
BEGIN
  SELECT period_start, period_end INTO s, e
  FROM wf_util.calc_period_bounds(p_frequency, p_pay_date);

  INSERT INTO payroll_runs(company_id, frequency, period_start, period_end, pay_date, created_by)
  VALUES (p_company_id, p_frequency, s, e, p_pay_date, p_created_by)
  ON CONFLICT ON CONSTRAINT uq_run_unique DO UPDATE
    SET created_by = EXCLUDED.created_by
  RETURNING id INTO new_id;

  RETURN new_id;
END
$$;

-- 9) Indexes
CREATE INDEX IF NOT EXISTS ix_runs_company_date ON payroll_runs (company_id, pay_date DESC);
CREATE INDEX IF NOT EXISTS ix_runs_company_status ON payroll_runs (company_id, status);
CREATE INDEX IF NOT EXISTS ix_run_items_run ON payroll_run_employees (run_id);
CREATE INDEX IF NOT EXISTS ix_run_items_company ON payroll_run_employees (company_id);

-- 10) RLS enable
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_run_employees ENABLE ROW LEVEL SECURITY;

-- 11) Drop any prior conflicting policies (from failed attempts)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payroll_runs' AND policyname = 'pr_modify_runs') THEN
    EXECUTE 'DROP POLICY pr_modify_runs ON payroll_runs';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payroll_run_employees' AND policyname = 'pr_modify_run_items') THEN
    EXECUTE 'DROP POLICY pr_modify_run_items ON payroll_run_employees';
  END IF;
END$$;

-- Also drop per-command policies so we can recreate idempotently
DROP POLICY IF EXISTS pr_view_runs    ON payroll_runs;
DROP POLICY IF EXISTS pr_insert_runs  ON payroll_runs;
DROP POLICY IF EXISTS pr_update_runs  ON payroll_runs;
DROP POLICY IF EXISTS pr_delete_runs  ON payroll_runs;

DROP POLICY IF EXISTS pr_view_run_items    ON payroll_run_employees;
DROP POLICY IF EXISTS pr_insert_run_items  ON payroll_run_employees;
DROP POLICY IF EXISTS pr_update_run_items  ON payroll_run_employees;
DROP POLICY IF EXISTS pr_delete_run_items  ON payroll_run_employees;

-- 12) Correct per-command policies

-- payroll_runs
CREATE POLICY pr_view_runs
ON payroll_runs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = payroll_runs.company_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY pr_insert_runs
ON payroll_runs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = payroll_runs.company_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','manager','processor')
  )
);

CREATE POLICY pr_update_runs
ON payroll_runs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = payroll_runs.company_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','manager','processor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = payroll_runs.company_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','manager','processor')
  )
);

CREATE POLICY pr_delete_runs
ON payroll_runs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = payroll_runs.company_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','manager')
  )
);

-- payroll_run_employees
CREATE POLICY pr_view_run_items
ON payroll_run_employees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = payroll_run_employees.company_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY pr_insert_run_items
ON payroll_run_employees
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = payroll_run_employees.company_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','manager','processor')
  )
);

CREATE POLICY pr_update_run_items
ON payroll_run_employees
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = payroll_run_employees.company_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','manager','processor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = payroll_run_employees.company_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','manager','processor')
  )
);

CREATE POLICY pr_delete_run_items
ON payroll_run_employees
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = payroll_run_employees.company_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','manager')
  )
);

-- 13) Employee default frequency
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS pay_frequency pay_frequency NOT NULL DEFAULT 'monthly';

COMMENT ON COLUMN public.employees.pay_frequency IS 'Default pay frequency for this employee; run frequency stored on payroll_runs.';
