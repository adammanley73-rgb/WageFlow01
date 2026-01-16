-- Add missing columns to payroll_runs table
-- The table already exists remotely but may be missing some columns

BEGIN;

-- Add columns that may be missing in remote database
ALTER TABLE public.payroll_runs
    ADD COLUMN IF NOT EXISTS status text;

-- Set default for status if column was just added
UPDATE public.payroll_runs
SET status = COALESCE(status, 'draft')
WHERE status IS NULL;

ALTER TABLE public.payroll_runs
    ALTER COLUMN status SET DEFAULT 'draft';

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
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status 
    ON public.payroll_runs (status);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_pay_date 
    ON public.payroll_runs (pay_date);

COMMIT;
