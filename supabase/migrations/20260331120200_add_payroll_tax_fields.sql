-- Migration: add payroll tax fields to employees table
-- Run this in your Supabase SQL editor or via the Supabase CLI

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS tax_code        VARCHAR(10)  DEFAULT '1257L',
  ADD COLUMN IF NOT EXISTS tax_basis       VARCHAR(12)  DEFAULT 'cumulative'
    CHECK (tax_basis IN ('cumulative', 'week1_month1')),
  ADD COLUMN IF NOT EXISTS ni_category     CHAR(1)      DEFAULT 'A'
    CHECK (ni_category IN ('A','B','C','H','J','M','Z')),
  ADD COLUMN IF NOT EXISTS student_loan_plan VARCHAR(10) DEFAULT NULL
    CHECK (student_loan_plan IN ('plan1','plan2','plan4','postgrad') OR student_loan_plan IS NULL),
  ADD COLUMN IF NOT EXISTS is_director     BOOLEAN      DEFAULT FALSE;

COMMENT ON COLUMN employees.tax_code         IS 'HMRC tax code, e.g. 1257L, BR, D0, NT, K505';
COMMENT ON COLUMN employees.tax_basis        IS 'cumulative = normal. week1_month1 = emergency / W1/M1 basis.';
COMMENT ON COLUMN employees.ni_category      IS 'NI category letter: A=standard, B=married women, C=over pension age, H=apprentice, J=deferred, M=under 21, Z=under 21 deferred';
COMMENT ON COLUMN employees.student_loan_plan IS 'Student or postgraduate loan plan if applicable';
COMMENT ON COLUMN employees.is_director      IS 'Directors use annual NI calculation method';
