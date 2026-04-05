-- C:\Projects\wageflow01\supabase\migrations\20260405120000_create_employee_contracts.sql
-- Create employee_contracts to separate person identity from contract/job records.

BEGIN;

-------------------------------------------------------------------------------
-- EMPLOYEE_CONTRACTS TABLE
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.employee_contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    contract_number text,
    job_title text,
    department text,
    status text NOT NULL DEFAULT 'active',
    start_date date NOT NULL,
    leave_date date,
    pay_frequency text,
    pay_basis text,
    annual_salary numeric(12,2),
    hourly_rate numeric(12,6),
    hours_per_week numeric(6,2),
    pay_after_leaving boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_contracts
    ADD COLUMN IF NOT EXISTS company_id uuid,
    ADD COLUMN IF NOT EXISTS employee_id uuid,
    ADD COLUMN IF NOT EXISTS contract_number text,
    ADD COLUMN IF NOT EXISTS job_title text,
    ADD COLUMN IF NOT EXISTS department text,
    ADD COLUMN IF NOT EXISTS status text,
    ADD COLUMN IF NOT EXISTS start_date date,
    ADD COLUMN IF NOT EXISTS leave_date date,
    ADD COLUMN IF NOT EXISTS pay_frequency text,
    ADD COLUMN IF NOT EXISTS pay_basis text,
    ADD COLUMN IF NOT EXISTS annual_salary numeric(12,2),
    ADD COLUMN IF NOT EXISTS hourly_rate numeric(12,6),
    ADD COLUMN IF NOT EXISTS hours_per_week numeric(6,2),
    ADD COLUMN IF NOT EXISTS pay_after_leaving boolean,
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.employee_contracts
SET status = COALESCE(status, 'active'),
    pay_after_leaving = COALESCE(pay_after_leaving, false),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now());

ALTER TABLE public.employee_contracts
    ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.employee_contracts
    ALTER COLUMN pay_after_leaving SET DEFAULT false;

ALTER TABLE public.employee_contracts
    ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.employee_contracts
    ALTER COLUMN updated_at SET DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'employee_contracts_status_check'
    ) THEN
        ALTER TABLE public.employee_contracts
        ADD CONSTRAINT employee_contracts_status_check
        CHECK (status IN ('active', 'leaver', 'inactive'));
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'employee_contracts_pay_frequency_check'
    ) THEN
        ALTER TABLE public.employee_contracts
        ADD CONSTRAINT employee_contracts_pay_frequency_check
        CHECK (
            pay_frequency IS NULL
            OR pay_frequency IN ('weekly', 'fortnightly', 'four_weekly', 'monthly')
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'employee_contracts_pay_basis_check'
    ) THEN
        ALTER TABLE public.employee_contracts
        ADD CONSTRAINT employee_contracts_pay_basis_check
        CHECK (
            pay_basis IS NULL
            OR pay_basis IN ('salary', 'hourly')
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'employee_contracts_company_id_fkey'
    ) THEN
        ALTER TABLE public.employee_contracts
        ADD CONSTRAINT employee_contracts_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'employee_contracts_employee_id_fkey'
    ) THEN
        ALTER TABLE public.employee_contracts
        ADD CONSTRAINT employee_contracts_employee_id_fkey
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
        FROM   pg_constraint
        WHERE  conname = 'employee_contracts_company_contract_number_key'
    ) THEN
        ALTER TABLE public.employee_contracts
        ADD CONSTRAINT employee_contracts_company_contract_number_key
        UNIQUE (company_id, contract_number);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_employee_contracts_company_id
    ON public.employee_contracts (company_id);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_employee_id
    ON public.employee_contracts (employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_company_employee
    ON public.employee_contracts (company_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_company_status
    ON public.employee_contracts (company_id, status);

COMMIT;
