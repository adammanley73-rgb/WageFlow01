-- 20250920120000_seed_payroll_runs_2025_26.sql
-- Seed UK tax year 2025/26 payroll runs (weekly, fortnightly, fourweekly, monthly)
-- Idempotent: safe to re-run. Sets pay_date = period_end.

-- Ensure required columns exist (no-op if already present)
ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS run_number        text,
  ADD COLUMN IF NOT EXISTS run_name          text,
  ADD COLUMN IF NOT EXISTS frequency         text,
  ADD COLUMN IF NOT EXISTS period_start      date,
  ADD COLUMN IF NOT EXISTS period_end        date,
  ADD COLUMN IF NOT EXISTS pay_period_start  date,
  ADD COLUMN IF NOT EXISTS pay_period_end    date,
  ADD COLUMN IF NOT EXISTS pay_date          date;

-- Unique run per company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'payroll_runs'
      AND indexname  = 'uq_payroll_runs_company_run_number'
  ) THEN
    CREATE UNIQUE INDEX uq_payroll_runs_company_run_number
      ON public.payroll_runs(company_id, run_number);
  END IF;
END$$;

-- Parameters
DO $$
DECLARE
  v_company_id uuid := '9d0aa562-dde9-44be-b7c6-accd4e63e7c1'::uuid;  -- your COMPANY_ID
  v_tax_start  date := DATE '2025-04-06';                              -- UK tax year start
BEGIN

  -- Build weeks 1..52
  WITH RECURSIVE weeks AS (
    SELECT 1 AS wk,
           v_tax_start::date AS start_date,
           (v_tax_start + INTERVAL '6 days')::date AS end_date
    UNION ALL
    SELECT wk + 1,
           (start_date + INTERVAL '7 days')::date,
           (end_date   + INTERVAL '7 days')::date
    FROM weeks
    WHERE wk < 52
  ),

  -- Weekly upsert (pay_date = period_end)
  up_week AS (
    INSERT INTO public.payroll_runs (
      company_id, run_number, run_name, frequency,
      period_start, period_end,
      pay_period_start, pay_period_end,
      pay_date
    )
    SELECT v_company_id,
           format('wk %s', wk),
           format('wk %s', wk),
           'weekly',
           start_date, end_date,
           start_date, end_date,
           end_date
    FROM weeks
    ON CONFLICT (company_id, run_number) DO UPDATE
      SET run_name         = EXCLUDED.run_name,
          frequency        = EXCLUDED.frequency,
          period_start     = EXCLUDED.period_start,
          period_end       = EXCLUDED.period_end,
          pay_period_start = EXCLUDED.pay_period_start,
          pay_period_end   = EXCLUDED.pay_period_end,
          pay_date         = EXCLUDED.pay_date
    RETURNING 1
  ),

  -- Fortnightly groups and upsert (pay_date = period_end)
  fortnights AS (
    SELECT CEIL(wk/2.0)::int grp,
           MIN(wk) AS wk1, MAX(wk) AS wk2,
           MIN(start_date) AS start_date,
           MAX(end_date)   AS end_date
    FROM weeks
    GROUP BY 1
    ORDER BY 1
  ),
  up_fn AS (
    INSERT INTO public.payroll_runs (
      company_id, run_number, run_name, frequency,
      period_start, period_end,
      pay_period_start, pay_period_end,
      pay_date
    )
    SELECT v_company_id,
           format('wk %s-%s', wk1, wk2),
           format('wk %s-%s', wk1, wk2),
           'fortnightly',
           start_date, end_date,
           start_date, end_date,
           end_date
    FROM fortnights
    ON CONFLICT (company_id, run_number) DO UPDATE
      SET run_name         = EXCLUDED.run_name,
          frequency        = EXCLUDED.frequency,
          period_start     = EXCLUDED.period_start,
          period_end       = EXCLUDED.period_end,
          pay_period_start = EXCLUDED.pay_period_start,
          pay_period_end   = EXCLUDED.pay_period_end,
          pay_date         = EXCLUDED.pay_date
    RETURNING 1
  ),

  -- Four-weekly groups and upsert (pay_date = period_end)
  fourweekly AS (
    SELECT CEIL(wk/4.0)::int grp,
           MIN(wk) AS wk1, MAX(wk) AS wk2,
           MIN(start_date) AS start_date,
           MAX(end_date)   AS end_date
    FROM weeks
    GROUP BY 1
    ORDER BY 1
  ),
  up_fw AS (
    INSERT INTO public.payroll_runs (
      company_id, run_number, run_name, frequency,
      period_start, period_end,
      pay_period_start, pay_period_end,
      pay_date
    )
    SELECT v_company_id,
           format('wk %s-%s', wk1, wk2),
           format('wk %s-%s', wk1, wk2),
           'fourweekly',
           start_date, end_date,
           start_date, end_date,
           end_date
    FROM fourweekly
    ON CONFLICT (company_id, run_number) DO UPDATE
      SET run_name         = EXCLUDED.run_name,
          frequency        = EXCLUDED.frequency,
          period_start     = EXCLUDED.period_start,
          period_end       = EXCLUDED.period_end,
          pay_period_start = EXCLUDED.pay_period_start,
          pay_period_end   = EXCLUDED.pay_period_end,
          pay_date         = EXCLUDED.pay_date
    RETURNING 1
  )

  -- Monthly upsert (tax months 1..12; pay_date = period_end)
  INSERT INTO public.payroll_runs (
    company_id, run_number, run_name, frequency,
    period_start, period_end,
    pay_period_start, pay_period_end,
    pay_date
  )
  SELECT v_company_id,
         format('Mth %s', m + 1),
         format('Mth %s', m + 1),
         'monthly',
         (v_tax_start + (m || ' months')::interval)::date,
         (v_tax_start + ((m + 1) || ' months')::interval - INTERVAL '1 day')::date,
         (v_tax_start + (m || ' months')::interval)::date,
         (v_tax_start + ((m + 1) || ' months')::interval - INTERVAL '1 day')::date,
         (v_tax_start + ((m + 1) || ' months')::interval - INTERVAL '1 day')::date
  FROM generate_series(0, 11) AS g(m)
  ON CONFLICT (company_id, run_number) DO UPDATE
    SET run_name         = EXCLUDED.run_name,
        frequency        = EXCLUDED.frequency,
        period_start     = EXCLUDED.period_start,
        period_end       = EXCLUDED.period_end,
        pay_period_start = EXCLUDED.pay_period_start,
        pay_period_end   = EXCLUDED.pay_period_end,
        pay_date         = EXCLUDED.pay_date;

  -- Patch any legacy nulls defensively
  UPDATE public.payroll_runs
  SET pay_period_start = COALESCE(pay_period_start, period_start),
      pay_period_end   = COALESCE(pay_period_end, period_end),
      run_name         = COALESCE(run_name, run_number),
      pay_date         = COALESCE(pay_date, period_end)
  WHERE company_id = v_company_id;

END$$;
