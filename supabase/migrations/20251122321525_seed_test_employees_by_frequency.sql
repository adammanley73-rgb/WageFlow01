-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251122xxxxxx_seed_test_employees_by_frequency.sql
-- Seed stable test employees for each pay frequency for The Business Consortium Ltd

BEGIN;

DO $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Find the test company by name
  SELECT id
  INTO v_company_id
  FROM public.companies
  WHERE name = 'The Business Consortium Ltd'
  ORDER BY created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE 'Seed test employees: company "The Business Consortium Ltd" not found, skipping inserts.';
    RETURN;
  END IF;

  -- Weekly test employee (W001)
  INSERT INTO public.employees (
    company_id,
    employee_number,
    first_name,
    last_name,
    known_as,
    email,
    status,
    start_date,
    hire_date,
    pay_frequency,
    pay_basis,
    annual_salary,
    hours_per_week,
    tax_code,
    ni_category,
    ni_number,
    student_loan,
    postgraduate_loan,
    is_director
  )
  VALUES (
    v_company_id,
    'W001',
    'Weekly',
    'Test',
    'Weekly',
    'weekly.test@wageflow.test',
    'active',
    DATE '2025-04-06',
    DATE '2025-04-06',
    'weekly',
    'salary',
    26000.00,
    37.50,
    '1257L',
    'A',
    'QQ123456A',
    'none',
    FALSE,
    FALSE
  )
  ON CONFLICT (company_id, employee_number) DO UPDATE
    SET
      pay_frequency    = EXCLUDED.pay_frequency,
      pay_basis        = EXCLUDED.pay_basis,
      annual_salary    = EXCLUDED.annual_salary,
      hours_per_week   = EXCLUDED.hours_per_week,
      tax_code         = EXCLUDED.tax_code,
      ni_category      = EXCLUDED.ni_category,
      ni_number        = EXCLUDED.ni_number,
      student_loan     = EXCLUDED.student_loan,
      postgraduate_loan= EXCLUDED.postgraduate_loan,
      status           = EXCLUDED.status;

  -- Fortnightly test employee (F001)
  INSERT INTO public.employees (
    company_id,
    employee_number,
    first_name,
    last_name,
    known_as,
    email,
    status,
    start_date,
    hire_date,
    pay_frequency,
    pay_basis,
    annual_salary,
    hours_per_week,
    tax_code,
    ni_category,
    ni_number,
    student_loan,
    postgraduate_loan,
    is_director
  )
  VALUES (
    v_company_id,
    'F001',
    'Fortnightly',
    'Test',
    'Fortnightly',
    'fortnightly.test@wageflow.test',
    'active',
    DATE '2025-04-06',
    DATE '2025-04-06',
    'fortnightly',
    'salary',
    26000.00,
    37.50,
    '1257L',
    'A',
    'QQ223456A',
    'none',
    FALSE,
    FALSE
  )
  ON CONFLICT (company_id, employee_number) DO UPDATE
    SET
      pay_frequency    = EXCLUDED.pay_frequency,
      pay_basis        = EXCLUDED.pay_basis,
      annual_salary    = EXCLUDED.annual_salary,
      hours_per_week   = EXCLUDED.hours_per_week,
      tax_code         = EXCLUDED.tax_code,
      ni_category      = EXCLUDED.ni_category,
      ni_number        = EXCLUDED.ni_number,
      student_loan     = EXCLUDED.student_loan,
      postgraduate_loan= EXCLUDED.postgraduate_loan,
      status           = EXCLUDED.status;

  -- Four-weekly test employee (4W01)
  INSERT INTO public.employees (
    company_id,
    employee_number,
    first_name,
    last_name,
    known_as,
    email,
    status,
    start_date,
    hire_date,
    pay_frequency,
    pay_basis,
    annual_salary,
    hours_per_week,
    tax_code,
    ni_category,
    ni_number,
    student_loan,
    postgraduate_loan,
    is_director
  )
  VALUES (
    v_company_id,
    '4W01',
    'Four Weekly',
    'Test',
    'Four Weekly',
    'fourweekly.test@wageflow.test',
    'active',
    DATE '2025-04-06',
    DATE '2025-04-06',
    'four_weekly',
    'salary',
    26000.00,
    37.50,
    '1257L',
    'A',
    'QQ323456A',
    'none',
    FALSE,
    FALSE
  )
  ON CONFLICT (company_id, employee_number) DO UPDATE
    SET
      pay_frequency    = EXCLUDED.pay_frequency,
      pay_basis        = EXCLUDED.pay_basis,
      annual_salary    = EXCLUDED.annual_salary,
      hours_per_week   = EXCLUDED.hours_per_week,
      tax_code         = EXCLUDED.tax_code,
      ni_category      = EXCLUDED.ni_category,
      ni_number        = EXCLUDED.ni_number,
      student_loan     = EXCLUDED.student_loan,
      postgraduate_loan= EXCLUDED.postgraduate_loan,
      status           = EXCLUDED.status;

  -- Monthly test employee (M001)
  INSERT INTO public.employees (
    company_id,
    employee_number,
    first_name,
    last_name,
    known_as,
    email,
    status,
    start_date,
    hire_date,
    pay_frequency,
    pay_basis,
    annual_salary,
    hours_per_week,
    tax_code,
    ni_category,
    ni_number,
    student_loan,
    postgraduate_loan,
    is_director
  )
  VALUES (
    v_company_id,
    'M001',
    'Monthly',
    'Test',
    'Monthly',
    'monthly.test@wageflow.test',
    'active',
    DATE '2025-04-06',
    DATE '2025-04-06',
    'monthly',
    'salary',
    26000.00,
    37.50,
    '1257L',
    'A',
    'QQ423456A',
    'none',
    FALSE,
    FALSE
  )
  ON CONFLICT (company_id, employee_number) DO UPDATE
    SET
      pay_frequency    = EXCLUDED.pay_frequency,
      pay_basis        = EXCLUDED.pay_basis,
      annual_salary    = EXCLUDED.annual_salary,
      hours_per_week   = EXCLUDED.hours_per_week,
      tax_code         = EXCLUDED.tax_code,
      ni_category      = EXCLUDED.ni_category,
      ni_number        = EXCLUDED.ni_number,
      student_loan     = EXCLUDED.student_loan,
      postgraduate_loan= EXCLUDED.postgraduate_loan,
      status           = EXCLUDED.status;

END;
$$;

COMMIT;
