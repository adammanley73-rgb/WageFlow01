begin;

-- Handle both 'frequency' and 'pay_frequency' column names
DO $$
DECLARE
  v_col text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payroll_runs' 
    AND column_name = 'frequency'
  ) THEN
    v_col := 'frequency';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payroll_runs' 
    AND column_name = 'pay_frequency'
  ) THEN
    v_col := 'pay_frequency';
  ELSE
    RAISE NOTICE 'payroll_runs has neither frequency nor pay_frequency column, skipping';
    RETURN;
  END IF;

  -- Normalize any legacy casing/spacing
  EXECUTE format('
    UPDATE public.payroll_runs
    SET %I = LOWER(BTRIM(%I))
    WHERE %I IS NOT NULL
  ', v_col, v_col, v_col);

  -- Fail fast if any invalid values exist
  IF EXISTS (
    SELECT 1
    FROM public.payroll_runs
    WHERE (v_col = 'frequency' AND frequency NOT IN ('weekly', 'fortnightly', 'four_weekly', 'monthly'))
       OR (v_col = 'pay_frequency' AND pay_frequency NOT IN ('weekly', 'fortnightly', 'four_weekly', 'monthly'))
  ) THEN
    RAISE EXCEPTION 'Invalid payroll_runs frequency values exist. Fix them before applying the check constraint.';
  END IF;

  -- Add the constraint if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'payroll_runs'
      AND c.conname = 'payroll_runs_frequency_check'
  ) THEN
    EXECUTE format('
      ALTER TABLE public.payroll_runs
      ADD CONSTRAINT payroll_runs_frequency_check
      CHECK (%I IN (''weekly'', ''fortnightly'', ''four_weekly'', ''monthly''))
    ', v_col);
  END IF;
END $$;

commit;
