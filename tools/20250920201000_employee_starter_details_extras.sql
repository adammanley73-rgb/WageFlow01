-- Add extra compliance fields and fix loan modeling
alter table public.employee_starter_details
  add column if not exists p45_week1_month1 boolean default false,
  add column if not exists prev_employer_paye_ref text,
  add column if not exists pg_loan boolean default false;

-- Make student_loan_plan only cover 1/2/4/5 or none
alter table public.employee_starter_details
  drop constraint if exists employee_starter_details_student_loan_plan_check;

alter table public.employee_starter_details
  add constraint employee_starter_details_student_loan_plan_check
  check (student_loan_plan in ('none','plan1','plan2','plan4','plan5'));

-- Ensure one row per employee for upsert on employee_id
create unique index if not exists ux_employee_starter_details_employee
  on public.employee_starter_details(employee_id);
