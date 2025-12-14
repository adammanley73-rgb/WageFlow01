-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251122123456_employees_and_payroll_run_employees_schema.sql
-- Schema alignment for employees and payroll_run_employees

BEGIN;

-------------------------------------------------------------------------------
-- EMPLOYEES TABLE
-------------------------------------------------------------------------------

-- Base table (id, company_id, basic identity)
CREATE TABLE IF NOT EXISTS public.employees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Core columns we want to standardise
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS employee_number text,
    ADD COLUMN IF NOT EXISTS known_as text,
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS ni_number text,
    ADD COLUMN IF NOT EXISTS status text,
    ADD COLUMN IF NOT EXISTS start_date date,
    ADD COLUMN IF NOT EXISTS leave_date date,
    ADD COLUMN IF NOT EXISTS date_of_birth date,
    ADD COLUMN IF NOT EXISTS gender text,
    ADD COLUMN IF NOT EXISTS tax_code text,
    ADD COLUMN IF NOT EXISTS ni_category text,
    ADD COLUMN IF NOT EXISTS student_loan text,
    ADD COLUMN IF NOT EXISTS postgraduate_loan boolean,
    ADD COLUMN IF NOT EXISTS pay_frequency text,
    ADD COLUMN IF NOT EXISTS pay_basis text,
    ADD COLUMN IF NOT EXISTS annual_salary numeric(12,2),
    ADD COLUMN IF NOT EXISTS hourly_rate numeric(12,6),
    ADD COLUMN IF NOT EXISTS hours_per_week numeric(6,2),
    ADD COLUMN IF NOT EXISTS job_title text,
    ADD COLUMN IF NOT EXISTS department text;

-- Sensible defaults where it is safe
UPDATE public.employees
SET status = COALESCE(status, 'active');

UPDATE public.employees
SET student_loan = COALESCE(student_loan, 'none');

UPDATE public.employees
SET postgraduate_loan = COALESCE(postgraduate_loan, false);

-- Make some columns NOT NULL only if safe
ALTER TABLE public.employees
    ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.employees
    ALTER COLUMN student_loan SET DEFAULT 'none';

ALTER TABLE public.employees
    ALTER COLUMN postgraduate_loan SET DEFAULT false;

-- Unique constraints: employee_number and NI per company
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'employees_company_id_employee_number_key'
    ) THEN
        ALTER TABLE public.employees
        ADD CONSTRAINT employees_company_id_employee_number_key
        UNIQUE (company_id, employee_number);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'employees_company_id_ni_number_key'
    ) THEN
        ALTER TABLE public.employees
        ADD CONSTRAINT employees_company_id_ni_number_key
        UNIQUE (company_id, ni_number);
    END IF;
END
$$;

-- Optional foreign key to companies (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'employees_company_id_fkey'
    ) THEN
        ALTER TABLE public.employees
        ADD CONSTRAINT employees_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE;
    END IF;
END
$$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_employees_company_id
    ON public.employees (company_id);

CREATE INDEX IF NOT EXISTS idx_employees_company_status
    ON public.employees (company_id, status);

-------------------------------------------------------------------------------
-- PAYROLL_RUN_EMPLOYEES TABLE
-------------------------------------------------------------------------------

-- Base table (id, run, employee, company)
CREATE TABLE IF NOT EXISTS public.payroll_run_employees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    company_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Snapshot configuration and money fields
ALTER TABLE public.payroll_run_employees
    ADD COLUMN IF NOT EXISTS tax_code_used text,
    ADD COLUMN IF NOT EXISTS ni_category_used text,
    ADD COLUMN IF NOT EXISTS student_loan_used text,
    ADD COLUMN IF NOT EXISTS pg_loan_used boolean,
    ADD COLUMN IF NOT EXISTS pay_frequency_used text,
    ADD COLUMN IF NOT EXISTS pay_basis_used text,
    ADD COLUMN IF NOT EXISTS hours_per_week_used numeric(6,2),
    ADD COLUMN IF NOT EXISTS basic_pay numeric(12,2),
    ADD COLUMN IF NOT EXISTS overtime_pay numeric(12,2),
    ADD COLUMN IF NOT EXISTS bonus_pay numeric(12,2),
    ADD COLUMN IF NOT EXISTS other_earnings numeric(12,2),
    ADD COLUMN IF NOT EXISTS gross_pay numeric(12,2),
    ADD COLUMN IF NOT EXISTS taxable_pay numeric(12,2),
    ADD COLUMN IF NOT EXISTS tax numeric(12,2),
    ADD COLUMN IF NOT EXISTS employee_ni numeric(12,2),
    ADD COLUMN IF NOT EXISTS employer_ni numeric(12,2),
    ADD COLUMN IF NOT EXISTS pension_employee numeric(12,2),
    ADD COLUMN IF NOT EXISTS pension_employer numeric(12,2),
    ADD COLUMN IF NOT EXISTS other_deductions numeric(12,2),
    ADD COLUMN IF NOT EXISTS attachment_of_earnings numeric(12,2),
    ADD COLUMN IF NOT EXISTS net_pay numeric(12,2),
    ADD COLUMN IF NOT EXISTS pay_after_leaving boolean,
    ADD COLUMN IF NOT EXISTS allow_negative_net boolean,
    ADD COLUMN IF NOT EXISTS negative_net_reason text,
    ADD COLUMN IF NOT EXISTS included_in_rti boolean,
    ADD COLUMN IF NOT EXISTS marked_for_payment boolean;

-- Defaults for numeric and boolean fields where safe
UPDATE public.payroll_run_employees
SET basic_pay = COALESCE(basic_pay, 0),
    overtime_pay = COALESCE(overtime_pay, 0),
    bonus_pay = COALESCE(bonus_pay, 0),
    other_earnings = COALESCE(other_earnings, 0),
    gross_pay = COALESCE(gross_pay, 0),
    taxable_pay = COALESCE(taxable_pay, 0),
    tax = COALESCE(tax, 0),
    employee_ni = COALESCE(employee_ni, 0),
    employer_ni = COALESCE(employer_ni, 0),
    pension_employee = COALESCE(pension_employee, 0),
    pension_employer = COALESCE(pension_employer, 0),
    other_deductions = COALESCE(other_deductions, 0),
    attachment_of_earnings = COALESCE(attachment_of_earnings, 0),
    net_pay = COALESCE(net_pay, 0);

UPDATE public.payroll_run_employees
SET pay_after_leaving = COALESCE(pay_after_leaving, false),
    allow_negative_net = COALESCE(allow_negative_net, false),
    included_in_rti = COALESCE(included_in_rti, false),
    marked_for_payment = COALESCE(marked_for_payment, true);

-- Enforce defaults
ALTER TABLE public.payroll_run_employees
    ALTER COLUMN basic_pay SET DEFAULT 0,
    ALTER COLUMN overtime_pay SET DEFAULT 0,
    ALTER COLUMN bonus_pay SET DEFAULT 0,
    ALTER COLUMN other_earnings SET DEFAULT 0,
    ALTER COLUMN gross_pay SET DEFAULT 0,
    ALTER COLUMN taxable_pay SET DEFAULT 0,
    ALTER COLUMN tax SET DEFAULT 0,
    ALTER COLUMN employee_ni SET DEFAULT 0,
    ALTER COLUMN employer_ni SET DEFAULT 0,
    ALTER COLUMN pension_employee SET DEFAULT 0,
    ALTER COLUMN pension_employer SET DEFAULT 0,
    ALTER COLUMN other_deductions SET DEFAULT 0,
    ALTER COLUMN attachment_of_earnings SET DEFAULT 0,
    ALTER COLUMN net_pay SET DEFAULT 0;

ALTER TABLE public.payroll_run_employees
    ALTER COLUMN pay_after_leaving SET DEFAULT false,
    ALTER COLUMN allow_negative_net SET DEFAULT false,
    ALTER COLUMN included_in_rti SET DEFAULT false,
    ALTER COLUMN marked_for_payment SET DEFAULT true;

-- Foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'payroll_run_employees_run_id_fkey'
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
        FROM   pg_constraint
        WHERE  conname = 'payroll_run_employees_employee_id_fkey'
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
        FROM   pg_constraint
        WHERE  conname = 'payroll_run_employees_company_id_fkey'
    ) THEN
        ALTER TABLE public.payroll_run_employees
        ADD CONSTRAINT payroll_run_employees_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id)
        ON DELETE CASCADE;
    END IF;
END
$$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_payroll_run_employees_run_id
    ON public.payroll_run_employees (run_id);

CREATE INDEX IF NOT EXISTS idx_payroll_run_employees_employee_id
    ON public.payroll_run_employees (employee_id);

CREATE INDEX IF NOT EXISTS idx_payroll_run_employees_company_run
    ON public.payroll_run_employees (company_id, run_id);

COMMIT;
