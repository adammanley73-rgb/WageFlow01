-- Create base payroll tables that must exist before other migrations reference them
-- These tables may already exist in remote database from earlier migrations
-- Using IF NOT EXISTS to make this safe for both fresh and existing databases

BEGIN;

-------------------------------------------------------------------------------
-- PAYROLL_RUNS TABLE
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    pay_period_start date NOT NULL,
    pay_period_end date NOT NULL,
    pay_date date NOT NULL,
    pay_frequency text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payroll_runs_company_id_fkey'
    ) THEN
        ALTER TABLE public.payroll_runs
        ADD CONSTRAINT payroll_runs_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE;
    END IF;
END
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company_id 
    ON public.payroll_runs (company_id);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_status 
    ON public.payroll_runs (status);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_pay_date 
    ON public.payroll_runs (pay_date);

COMMIT;
