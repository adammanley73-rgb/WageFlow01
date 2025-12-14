-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251211XXXXXX_update_gender_constraint_on_employees.sql

--------------------------------------------------------------------------------
-- Update gender constraint on employees to allow:
-- 'male', 'female', 'non_binary', 'other', 'prefer_not_to_say', or NULL
--------------------------------------------------------------------------------

-- Drop the existing CHECK constraint if it exists
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_gender_valid;

-- Recreate it with the expanded set of allowed values
ALTER TABLE public.employees
  ADD CONSTRAINT employees_gender_valid
  CHECK (
    gender IS NULL
    OR gender IN (
      'male',
      'female',
      'non_binary',
      'other',
      'prefer_not_to_say'
    )
  );
