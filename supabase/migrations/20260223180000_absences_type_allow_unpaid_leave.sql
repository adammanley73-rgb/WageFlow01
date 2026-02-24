-- C:\Projects\wageflow01\supabase\migrations\20260223180000_absences_type_allow_unpaid_leave.sql

BEGIN;

-- Create a replacement constraint that includes unpaid_leave
-- Use NOT VALID so it does not scan historical rows during the change.
ALTER TABLE public.absences
  ADD CONSTRAINT absences_type_check_v2
  CHECK (
    type IS NULL OR type IN (
      'annual_leave',
      'sickness',
      'maternity',
      'paternity',
      'shared_parental',
      'adoption',
      'parental_bereavement',
      'unpaid_leave'
    )
  )
  NOT VALID;

-- Drop the old constraint that is currently rejecting unpaid_leave
ALTER TABLE public.absences
  DROP CONSTRAINT IF EXISTS absences_type_check;

-- Rename the new constraint to keep the original name
ALTER TABLE public.absences
  RENAME CONSTRAINT absences_type_check_v2 TO absences_type_check;

COMMIT;