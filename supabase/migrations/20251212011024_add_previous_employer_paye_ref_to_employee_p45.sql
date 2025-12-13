-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\YYYYMMDDHHMMSS_add_previous_employer_paye_ref_to_employee_p45.sql

-- Add a column to store the previous employer PAYE reference from the employee's P45
ALTER TABLE public.employee_p45
  ADD COLUMN IF NOT EXISTS previous_employer_paye_ref text;

-- Optional future tidy up notes:
-- - Keep this nullable so existing rows remain valid
-- - If you ever need to enforce it, add a CHECK or NOT NULL on new rows only
