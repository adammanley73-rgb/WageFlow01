-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\202511221730_fix_four_weekly_frequency.sql

-- 1) Drop existing frequency check so we can normalise values safely
ALTER TABLE public.payroll_runs
DROP CONSTRAINT IF EXISTS payroll_runs_frequency_check;

-- 2) Normalise payroll_runs.frequency OR pay_frequency: fourweekly -> four_weekly
-- Handle both column names for backward compatibility
DO $$
BEGIN
    -- Try frequency column first
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'payroll_runs' 
               AND column_name = 'frequency') THEN
        UPDATE public.payroll_runs
        SET frequency = 'four_weekly'
        WHERE frequency = 'fourweekly';
    END IF;
    
    -- Try pay_frequency column
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'payroll_runs' 
               AND column_name = 'pay_frequency') THEN
        UPDATE public.payroll_runs
        SET pay_frequency = 'four_weekly'
        WHERE pay_frequency = 'fourweekly';
    END IF;
END $$;

-- 3) Normalise employees.pay_frequency: fourweekly -> four_weekly
UPDATE public.employees
SET pay_frequency = 'four_weekly'
WHERE pay_frequency = 'fourweekly';

-- 4) Recreate the CHECK constraint with the correct allowed values
-- Only add to frequency column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'payroll_runs' 
               AND column_name = 'frequency') THEN
        ALTER TABLE public.payroll_runs
        ADD CONSTRAINT payroll_runs_frequency_check
        CHECK (frequency IN ('weekly', 'fortnightly', 'four_weekly', 'monthly'));
    END IF;
END $$;
