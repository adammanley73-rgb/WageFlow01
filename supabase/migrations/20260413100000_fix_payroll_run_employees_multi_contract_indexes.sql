BEGIN;

DO $$
DECLARE
    r record;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.payroll_run_employees'::regclass
          AND conname = 'pre_one_row_per_employee'
    ) THEN
        ALTER TABLE public.payroll_run_employees
        DROP CONSTRAINT pre_one_row_per_employee;
    END IF;

    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t
          ON t.oid = c.conrelid
        JOIN pg_namespace n
          ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'payroll_run_employees'
          AND c.contype = 'u'
          AND (
              SELECT array_agg((a.attname)::text ORDER BY u.ord)
              FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord)
              JOIN pg_attribute a
                ON a.attrelid = c.conrelid
               AND a.attnum = u.attnum
          ) = ARRAY['run_id','employee_id']::text[]
    LOOP
        EXECUTE format(
            'ALTER TABLE public.payroll_run_employees DROP CONSTRAINT %I',
            r.conname
        );
    END LOOP;

    FOR r IN
        SELECT i.indexname
        FROM pg_indexes i
        WHERE i.schemaname = 'public'
          AND i.tablename = 'payroll_run_employees'
          AND i.indexdef ILIKE 'CREATE UNIQUE INDEX % ON public.payroll_run_employees USING btree (run_id, employee_id)%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
    END LOOP;
END
$$;

CREATE INDEX IF NOT EXISTS idx_payroll_run_employees_run_employee
ON public.payroll_run_employees (run_id, employee_id);

DROP INDEX IF EXISTS public.idx_payroll_run_employees_run_contract;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_run_employees_run_contract
ON public.payroll_run_employees (run_id, contract_id)
WHERE contract_id IS NOT NULL;

COMMIT;