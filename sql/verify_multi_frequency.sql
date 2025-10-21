/*
C:\Users\adamm\Projects\wageflow01\sql\verify_multi_frequency.sql
WageFlow multi-frequency core verification script
Run this entire block in Supabase Studio → SQL Editor.
It checks enums, tables, RLS, policies, and helper functions.
Nothing persists because it rolls back at the end.
*/

BEGIN;

-- 1) Enum exists and has all labels
SELECT 'enum_pay_frequency' AS check, enumlabel
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'pay_frequency'
ORDER BY enumlabel;

-- 2) Core tables exist
SELECT 'tables_exist' AS check, c.relname AS table_name, c.relkind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('payroll_runs','payroll_run_employees')
ORDER BY c.relname;

-- 3) RLS enabled on both tables
SELECT 'rls_enabled' AS check, n.nspname, c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('payroll_runs','payroll_run_employees')
ORDER BY c.relname;

-- 4) Policies present (detail view)
SELECT
  'policies' AS check,
  policyname,
  schemaname,
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('payroll_runs','payroll_run_employees')
ORDER BY tablename, policyname;

-- 5) Helper functions exist
SELECT 'functions' AS check, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE (n.nspname = 'wf_util' AND p.proname IN ('calc_period_bounds','hmrc_tax_year','hmrc_tax_week','create_payroll_run'))
ORDER BY n.nspname, p.proname;

-- 6) Smoke test skipped (no UUIDs provided)
-- Uncomment and supply real UUIDs when ready to test RPC.
-- SELECT 'create_run' AS check,
--        wf_util.create_payroll_run(
--          '<company_uuid_here>',
--          'weekly',
--          CURRENT_DATE,
--          '<user_uuid_here>'
--        ) AS new_run_id;

-- 7) RLS simulation with auto-detected valid role and real existing user (runs inside transaction)
DO $$
DECLARE
  v_user uuid;
  v_company uuid;
  v_role text;
  v_usr_schema text;
  v_usr_table  text;
  v_usr_col    text;
BEGIN
  -- Ensure at least one company exists
  SELECT id INTO v_company FROM public.companies LIMIT 1;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'No companies found. Seed one company first.';
  END IF;

  -- Find the CHECK constraint roles and pick a valid one
  WITH def AS (
    SELECT pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'company_memberships'
      AND c.conname ILIKE '%role_check%'
    LIMIT 1
  ),
  allowed AS (
    SELECT (regexp_matches(def, '''([^'']+)''', 'g'))[1] AS role FROM def
  )
  SELECT COALESCE(
           (SELECT role FROM allowed WHERE role IN ('owner','admin','manager','processor','user','viewer') LIMIT 1),
           (SELECT role FROM allowed LIMIT 1)
         )
    INTO v_role;

  IF v_role IS NULL THEN
    -- Fallback: try any existing role present in table
    SELECT role INTO v_role FROM public.company_memberships LIMIT 1;
  END IF;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Could not determine a valid role for company_memberships.role. Check your constraint.';
  END IF;

  -- Detect the FK target for company_memberships.user_id (schema.table.column)
  WITH fk AS (
    SELECT
      n2.nspname  AS ref_schema,
      c2.relname  AS ref_table,
      a2.attname  AS ref_col
    FROM pg_constraint con
    JOIN pg_class c  ON c.oid  = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class c2 ON c2.oid = con.confrelid
    JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
    JOIN unnest(con.conkey)  WITH ORDINALITY ck(attnum, ord) ON true
    JOIN unnest(con.confkey) WITH ORDINALITY fk(attnum, ord) ON ck.ord = fk.ord
    JOIN pg_attribute a2 ON a2.attrelid = con.confrelid AND a2.attnum = fk.attnum
    WHERE n.nspname = 'public'
      AND c.relname = 'company_memberships'
      AND con.conname ILIKE '%user_id_fkey%'
    LIMIT 1
  )
  SELECT ref_schema, ref_table, ref_col
    INTO v_usr_schema, v_usr_table, v_usr_col
  FROM fk;

  IF v_usr_schema IS NULL THEN
    RAISE EXCEPTION 'Could not locate FK target for company_memberships.user_id. Check your schema.';
  END IF;

  -- Pick a real existing user id from the FK target table
  EXECUTE format('SELECT %I FROM %I.%I LIMIT 1', v_usr_col, v_usr_schema, v_usr_table) INTO v_user;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No rows found in %.% — create at least one user and retry.', v_usr_schema, v_usr_table;
  END IF;

  -- Insert membership using a valid role and a real existing user id
  INSERT INTO public.company_memberships(company_id, user_id, role)
  VALUES (v_company, v_user, v_role);

  -- Impersonate this user for auth.uid() within this transaction
  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);

  -- Try SELECT (should scope to v_company)
  RAISE NOTICE 'RLS SELECT count for payroll_runs (company %): %',
    v_company,
    (SELECT COUNT(*) FROM public.payroll_runs r WHERE EXISTS (
       SELECT 1 FROM public.company_memberships m
       WHERE m.company_id = r.company_id AND m.user_id = v_user));

  -- Try creating a run via RPC as this user (may be blocked by your write-role policy; that's fine)
  PERFORM wf_util.create_payroll_run(v_company, 'monthly', CURRENT_DATE, v_user);
END$$;

-- 8) Show latest 5 runs (informational)
SELECT 'latest_runs' AS check, id, company_id, frequency, period_start, period_end, pay_date, status
FROM public.payroll_runs
ORDER BY pay_date DESC, created_at DESC
LIMIT 5;

-- Nothing persists from this verification run.
ROLLBACK;
