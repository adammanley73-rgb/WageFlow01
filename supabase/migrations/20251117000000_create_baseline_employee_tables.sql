-- Create baseline employees and payroll_run_employees tables
-- These must exist before 20251118234500_add_pay_elements.sql which references them
-- The full schema is completed in 20251122123456_employees_and_payroll_run_employees_schema.sql
-- Using IF NOT EXISTS so this works on both fresh and existing databases

BEGIN;

-------------------------------------------------------------------------------
-- EMPLOYEES TABLE (baseline)
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.employees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'employees_company_id_fkey'
    ) THEN
        ALTER TABLE public.employees
        ADD CONSTRAINT employees_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_employees_company_id
    ON public.employees (company_id);

-------------------------------------------------------------------------------
-- PAYROLL_RUN_EMPLOYEES TABLE (baseline)
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payroll_run_employees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    company_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign keys only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payroll_run_employees_run_id_fkey'
    ) THEN
        ALTER TABLE public.payroll_run_employees
        ADD CONSTRAINT payroll_run_employees_run_id_fkey
        FOREIGN KEY (run_id)
        REFERENCES public.payroll_runs(id)
        ON DELETE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payroll_run_employees_employee_id_fkey'
    ) THEN
        ALTER TABLE public.payroll_run_employees
        ADD CONSTRAINT payroll_run_employees_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payroll_run_employees_company_id_fkey'
    ) THEN
        ALTER TABLE public.payroll_run_employees
        ADD CONSTRAINT payroll_run_employees_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_payroll_run_employees_run_id
    ON public.payroll_run_employees (run_id);

CREATE INDEX IF NOT EXISTS idx_payroll_run_employees_employee_id
    ON public.payroll_run_employees (employee_id);

CREATE INDEX IF NOT EXISTS idx_payroll_run_employees_company_run
    ON public.payroll_run_employees (company_id, run_id);

COMMIT;
