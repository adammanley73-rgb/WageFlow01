-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\202511221730_fix_four_weekly_frequency.sql

-- 1) Drop existing frequency check so we can normalise values safely
ALTER TABLE public.payroll_runs
DROP CONSTRAINT IF EXISTS payroll_runs_frequency_check;

-- 2) Normalise payroll_runs.frequency: fourweekly -> four_weekly
UPDATE public.payroll_runs
SET frequency = 'four_weekly'
WHERE frequency = 'fourweekly';

-- 3) Normalise employees.pay_frequency: fourweekly -> four_weekly
UPDATE public.employees
SET pay_frequency = 'four_weekly'
WHERE pay_frequency = 'fourweekly';

-- 4) Recreate the CHECK constraint with the correct allowed values
ALTER TABLE public.payroll_runs
ADD CONSTRAINT payroll_runs_frequency_check
CHECK (frequency IN ('weekly', 'fortnightly', 'four_weekly', 'monthly'));
