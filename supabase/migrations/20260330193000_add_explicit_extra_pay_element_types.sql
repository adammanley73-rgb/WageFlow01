-- C:\Projects\wageflow01\supabase\migrations\20260330193000_add_explicit_extra_pay_element_types.sql

begin;

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
  null,
  'OT125',
  'OT x 1.25',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1
  from public.pay_element_types
  where code = 'OT125'
);

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
  null,
  'OT150',
  'OT x 1.5',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1
  from public.pay_element_types
  where code = 'OT150'
);

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
  null,
  'OT175',
  'OT x 1.75',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1
  from public.pay_element_types
  where code = 'OT175'
);

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
  null,
  'OT200',
  'OT x 2',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1
  from public.pay_element_types
  where code = 'OT200'
);

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
  null,
  'COMM',
  'Commission',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1
  from public.pay_element_types
  where code = 'COMM'
);

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
  null,
  'BACKPAY',
  'Backpay',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1
  from public.pay_element_types
  where code = 'BACKPAY'
);

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
  null,
  'ALLOW_TAX',
  'Taxable allowance',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1
  from public.pay_element_types
  where code = 'ALLOW_TAX'
);

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
  null,
  'ALLOW_NONTAX',
  'Non-taxable allowance',
  'earning',
  false,
  false,
  false,
  false,
  false
where not exists (
  select 1
  from public.pay_element_types
  where code = 'ALLOW_NONTAX'
);

commit;
