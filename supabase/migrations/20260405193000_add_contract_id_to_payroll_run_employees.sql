alter table public.payroll_run_employees
add column if not exists contract_id uuid;

update public.payroll_run_employees pre
set contract_id = ec.id
from public.employee_contracts ec
where pre.contract_id is null
  and ec.employee_id = pre.employee_id
  and (
    select count(*)
    from public.employee_contracts ec2
    where ec2.employee_id = pre.employee_id
  ) = 1;

create index if not exists idx_payroll_run_employees_contract_id
on public.payroll_run_employees (contract_id);

create index if not exists idx_payroll_run_employees_run_contract
on public.payroll_run_employees (run_id, contract_id);

alter table public.payroll_run_employees
drop constraint if exists payroll_run_employees_contract_id_fkey;

alter table public.payroll_run_employees
add constraint payroll_run_employees_contract_id_fkey
foreign key (contract_id)
references public.employee_contracts (id)
on delete restrict;