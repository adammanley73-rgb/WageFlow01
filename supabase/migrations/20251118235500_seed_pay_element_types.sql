-- 20251118235500_seed_pay_element_types.sql
-- Seed a core set of pay element types (global, company_id = null)

begin;

-- Helper to avoid duplicate insert for each code
-- We use individual INSERT ... SELECT ... WHERE NOT EXISTS blocks
-- so running this migration twice does not create duplicates.

--------------------------
-- EARNINGS
--------------------------

-- Basic pay
insert into public.pay_element_types (
  company_id,
  code,
  name,
  side,
  taxable_for_paye,
  nic_earnings,
  pensionable_default,
  ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null as company_id,
  'BASIC' as code,
  'Basic pay' as name,
  'earning' as side,
  true as taxable_for_paye,
  true as nic_earnings,
  true as pensionable_default,
  true as ae_qualifying_default,
  false as is_salary_sacrifice_type
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'BASIC'
);

-- Overtime (generic, you can refine later)
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'OVERTIME',
  'Overtime pay',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'OVERTIME'
);

-- Bonus
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'BONUS',
  'Bonus',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'BONUS'
);

-- Commission
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'COMMISSION',
  'Commission',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'COMMISSION'
);

-- Holiday pay
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'HOLIDAY',
  'Holiday pay',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'HOLIDAY'
);

-- Statutory Sick Pay
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'SSP',
  'Statutory Sick Pay',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'SSP'
);

-- Statutory Maternity Pay (and similar)
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'SMP',
  'Statutory Maternity / Parental Pay',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'SMP'
);

-- Car allowance (cash)
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'ALLOWANCE_CAR',
  'Car allowance',
  'earning',
  true,
  true,
  false,  -- many schemes do not treat this as pensionable
  true,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'ALLOWANCE_CAR'
);

-- Location allowance
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'ALLOWANCE_LOCATION',
  'Location allowance',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'ALLOWANCE_LOCATION'
);

-- Approved mileage / expenses reimbursement (non-tax, non-NI)
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'REIMBURSE_APPROVED',
  'Approved reimbursed expenses',
  'earning',
  false,
  false,
  false,
  false,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'REIMBURSE_APPROVED'
);

-- Taxable reimbursement (e.g. excess mileage)
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'REIMBURSE_TAXABLE',
  'Taxable reimbursed expenses',
  'earning',
  true,
  true,
  false,
  true,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'REIMBURSE_TAXABLE'
);

--------------------------
-- DEDUCTIONS
--------------------------

-- PAYE tax (informational element)
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'TAX_PAYE',
  'PAYE income tax',
  'deduction',
  false,
  false,
  false,
  false,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'TAX_PAYE'
);

-- Employee NIC
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'NIC_EMP',
  'Employee National Insurance',
  'deduction',
  false,
  false,
  false,
  false,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'NIC_EMP'
);

-- Employee pension (net pay arrangement)
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'PENSION_EMP_NETPAY',
  'Employee pension (net pay arrangement)',
  'deduction',
  false, -- this deduction reduces taxable pay upstream, but the deduction line itself is post-calculation
  false,
  false,
  false,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'PENSION_EMP_NETPAY'
);

-- Employee pension (relief at source)
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'PENSION_EMP_RAS',
  'Employee pension (relief at source)',
  'deduction',
  false,
  false,
  false,
  false,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'PENSION_EMP_RAS'
);

-- Student loan
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'STUDENT_LOAN',
  'Student loan repayment',
  'deduction',
  false,
  false,
  false,
  false,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'STUDENT_LOAN'
);

-- Postgraduate loan
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'POSTGRAD_LOAN',
  'Postgraduate loan repayment',
  'deduction',
  false,
  false,
  false,
  false,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'POSTGRAD_LOAN'
);

-- Attachment of earnings / court order
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'AEO',
  'Attachment of earnings / court order',
  'deduction',
  false,
  false,
  false,
  false,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'AEO'
);

-- Generic net deduction
insert into public.pay_element_types (
  company_id, code, name, side,
  taxable_for_paye, nic_earnings,
  pensionable_default, ae_qualifying_default,
  is_salary_sacrifice_type
)
select
  null,
  'NET_DEDUCTION_OTHER',
  'Other net deduction',
  'deduction',
  false,
  false,
  false,
  false,
  false
where not exists (
  select 1 from public.pay_element_types
  where company_id is null and code = 'NET_DEDUCTION_OTHER'
);

commit;
