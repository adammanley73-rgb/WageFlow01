-- Add pay_after_leaving flag to pay_run_employees
ALTER TABLE pay_run_employees
ADD COLUMN pay_after_leaving boolean NOT NULL DEFAULT false;

-- Backfill existing rows
UPDATE pay_run_employees
SET pay_after_leaving = false
WHERE pay_after_leaving IS NULL;
