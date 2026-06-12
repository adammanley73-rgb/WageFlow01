-- C:\Projects\wageflow01\supabase\migrations\20260611191000_fix_student_loan_plan5_constraints.sql

alter table public.employees
  drop constraint if exists employees_student_loan_plan_check;

alter table public.employees
  add constraint employees_student_loan_plan_check
  check (
    student_loan_plan is null
    or student_loan_plan::text = any (
      array['plan1', 'plan2', 'plan4', 'plan5', 'postgrad']::text[]
    )
  );

alter table public.employee_starters
  drop constraint if exists employee_starters_student_loan_plan_check;

alter table public.employee_starters
  add constraint employee_starters_student_loan_plan_check
  check (
    student_loan_plan is null
    or student_loan_plan = any (
      array['plan1', 'plan2', 'plan4', 'plan5']::text[]
    )
  );
