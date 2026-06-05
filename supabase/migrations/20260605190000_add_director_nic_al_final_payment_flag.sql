alter table public.payroll_run_employees
add column if not exists director_final_payment_for_tax_year boolean not null default false;

comment on column public.payroll_run_employees.director_final_payment_for_tax_year
is 'Marks this payroll run employee row as the director final payment for the tax year for Director NIC Alternative Method calculations. Only applies when is_director_used is true and director_nic_method_used is AL.';
