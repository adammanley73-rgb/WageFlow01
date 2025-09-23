-- supabase/migrations/20250920090000_employee_delete_guard.sql
-- Purpose: Prevent deleting employees that are referenced in payroll data.
-- Safe on fresh DBs where payroll tables may not exist yet.

BEGIN;

-- 1) Ensure employees has a primary key on id (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.employees'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);
  END IF;
END
$$;

-- Helper: does a table exist
CREATE OR REPLACE FUNCTION public._table_exists(p_schema text, p_table text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT to_regclass(format('%I.%I', p_schema, p_table)) IS NOT NULL;
$$;

-- 2) Add FK on payroll_run_employees.employee_id if table exists
DO $$
BEGIN
  IF public._table_exists('public','payroll_run_employees') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'payroll_run_employees_employee_id_fkey'
    ) THEN
      ALTER TABLE public.payroll_run_employees
      ADD CONSTRAINT payroll_run_employees_employee_id_fkey
      FOREIGN KEY (employee_id)
      REFERENCES public.employees(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
    END IF;

    -- Index to speed up prechecks
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_payroll_run_employees_employee_id'
    ) THEN
      CREATE INDEX idx_payroll_run_employees_employee_id
        ON public.payroll_run_employees(employee_id);
    END IF;
  END IF;
END
$$;

-- 3) Add FK on payroll_entries.employee_id if table exists
DO $$
BEGIN
  IF public._table_exists('public','payroll_entries') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'payroll_entries_employee_id_fkey'
    ) THEN
      ALTER TABLE public.payroll_entries
      ADD CONSTRAINT payroll_entries_employee_id_fkey
      FOREIGN KEY (employee_id)
      REFERENCES public.employees(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
    END IF;

    -- Index to speed up prechecks
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_payroll_entries_employee_id'
    ) THEN
      CREATE INDEX idx_payroll_entries_employee_id
        ON public.payroll_entries(employee_id);
    END IF;
  END IF;
END
$$;

COMMIT;
