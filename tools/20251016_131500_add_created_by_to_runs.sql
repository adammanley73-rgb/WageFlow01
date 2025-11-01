-- 20251016_131500_add_created_by_to_runs.sql
-- Patch legacy payroll_runs to include created_by so RPC works idempotently.

-- Add column if it doesn't exist
ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Optional: created_at and approved_at for parity (won't hurt if they exist)
ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL;

-- Touch the unique constraint only if it’s missing (it probably exists already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.payroll_runs'::regclass
      AND conname = 'uq_run_unique'
  ) THEN
    ALTER TABLE public.payroll_runs
      ADD CONSTRAINT uq_run_unique UNIQUE (company_id, frequency, period_start, period_end, pay_date);
  END IF;
END$$;

-- Recreate RPC to be safe (idempotent, same body as v2)
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

  INSERT INTO public.payroll_runs(company_id, frequency, period_start, period_end, pay_date, created_by)
  VALUES (p_company_id, p_frequency, s, e, p_pay_date, p_created_by)
  ON CONFLICT ON CONSTRAINT uq_run_unique DO UPDATE
    SET created_by = EXCLUDED.created_by
  RETURNING id INTO new_id;

  RETURN new_id;
END
$$;
