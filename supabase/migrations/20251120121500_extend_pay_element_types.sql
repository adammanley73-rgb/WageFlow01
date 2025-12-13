BEGIN;

-- Add Statutory Parental Bereavement Pay if missing
insert into public.pay_element_types (
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
  'SPBP',
  'Statutory Parental Bereavement Pay',
  'earning',
  true,
  true,
  false,
  false,
  false
where not exists (
  select 1 from public.pay_element_types where code = 'SPBP'
);

-- Add Statutory Neonatal Care Pay if missing
insert into public.pay_element_types (
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
  'SNCP',
  'Statutory Neonatal Care Pay',
  'earning',
  true,
  true,
  false,
  false,
  false
where not exists (
  select 1 from public.pay_element_types where code = 'SNCP'
);

-- Add Employee pension (salary sacrifice) if missing
insert into public.pay_element_types (
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
  'PENSION_EMP_SAL_SAC',
  'Employee pension (salary sacrifice)',
  'deduction',
  false,
  false,
  true,
  true,
  true
where not exists (
  select 1 from public.pay_element_types where code = 'PENSION_EMP_SAL_SAC'
);

COMMIT;
