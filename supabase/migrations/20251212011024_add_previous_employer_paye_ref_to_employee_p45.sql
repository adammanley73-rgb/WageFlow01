-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\YYYYMMDDHHMMSS_add_previous_employer_paye_ref_to_employee_p45.sql

-- Add a column to store the previous employer PAYE reference from the employee's P45
-- Defensive: only alter if table exists

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'employee_p45'
  ) THEN
    ALTER TABLE public.employee_p45
      ADD COLUMN IF NOT EXISTS previous_employer_paye_ref text;
    
    RAISE NOTICE 'Added previous_employer_paye_ref column to employee_p45 table.';
  ELSE
    RAISE NOTICE 'Table employee_p45 does not exist, skipping column addition.';
  END IF;
END $$;

-- Optional future tidy up notes:
-- - Keep this nullable so existing rows remain valid
-- - If you ever need to enforce it, add a CHECK or NOT NULL on new rows only
