begin;

-- Make sure no legacy NULLs exist before constraint change
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

  -- Set default for NULL values
  EXECUTE format('
    UPDATE public.payroll_runs
    SET %I = ''monthly''
    WHERE %I IS NULL OR BTRIM(%I) = ''''
  ', v_col, v_col, v_col);

  -- Enforce NOT NULL
  EXECUTE format('
    ALTER TABLE public.payroll_runs
    ALTER COLUMN %I SET NOT NULL
  ', v_col);
END $$;

commit;
