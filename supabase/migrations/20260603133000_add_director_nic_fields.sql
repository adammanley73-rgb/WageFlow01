alter table public.employees
add column if not exists director_nic_method text;

alter table public.employees
add column if not exists director_appointment_week integer;

alter table public.payroll_run_employees
add column if not exists is_director_used boolean;

alter table public.payroll_run_employees
add column if not exists director_nic_method_used text;

alter table public.payroll_run_employees
add column if not exists director_appointment_week_used integer;

update public.employees
set director_nic_method = null
where is_director is not true
  and director_nic_method is not null;

update public.employees
set director_appointment_week = null
where is_director is not true
  and director_appointment_week is not null;

update public.payroll_run_employees
set is_director_used = false
where is_director_used is null;

alter table public.payroll_run_employees
alter column is_director_used set default false;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint c
    join pg_class t
      on t.oid = c.conrelid
    join pg_namespace n
      on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'employees'
      and c.contype = 'c'
      and (
        pg_get_constraintdef(c.oid) ilike '%director_nic_method%'
        or pg_get_constraintdef(c.oid) ilike '%director_appointment_week%'
      )
  loop
    execute format('alter table public.employees drop constraint if exists %I', v_constraint.conname);
  end loop;
end;
$$;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint c
    join pg_class t
      on t.oid = c.conrelid
    join pg_namespace n
      on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'payroll_run_employees'
      and c.contype = 'c'
      and (
        pg_get_constraintdef(c.oid) ilike '%director_nic_method_used%'
        or pg_get_constraintdef(c.oid) ilike '%director_appointment_week_used%'
      )
  loop
    execute format('alter table public.payroll_run_employees drop constraint if exists %I', v_constraint.conname);
  end loop;
end;
$$;

alter table public.employees
add constraint employees_director_nic_method_check
check (
  director_nic_method is null
  or director_nic_method in ('AN', 'AL')
);

alter table public.employees
add constraint employees_director_appointment_week_check
check (
  director_appointment_week is null
  or director_appointment_week between 1 and 53
);

alter table public.payroll_run_employees
add constraint payroll_run_employees_director_nic_method_used_check
check (
  director_nic_method_used is null
  or director_nic_method_used in ('AN', 'AL')
);

alter table public.payroll_run_employees
add constraint payroll_run_employees_director_appointment_week_used_check
check (
  director_appointment_week_used is null
  or director_appointment_week_used between 1 and 53
);
