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
  'SICK_BASIC_REDUCTION',
  'Sickness absence adjustment',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1
  from public.pay_element_types
  where company_id is null
    and code = 'SICK_BASIC_REDUCTION'
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
  'OSP',
  'Occupational Sick Pay',
  'earning',
  true,
  true,
  true,
  true,
  false
where not exists (
  select 1
  from public.pay_element_types
  where company_id is null
    and code = 'OSP'
);

commit;