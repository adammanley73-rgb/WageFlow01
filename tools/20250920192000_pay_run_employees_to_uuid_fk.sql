-- 20250920192000_pay_run_employees_to_uuid_fk.sql
-- Migrate pay_run_employees.employee_id (text like 'emp-001') to a proper UUID FK -> employees.id.

create extension if not exists pgcrypto;

-- Ensure employees.id exists and has a default
alter table public.employees
  add column if not exists id uuid;
alter table public.employees
  alter column id set default gen_random_uuid();

-- 1) Drop any old FK that might still exist
alter table public.pay_run_employees
  drop constraint if exists pay_run_employees_employee_id_fkey;

-- 2) If employee_id is not uuid, rename and add a new uuid column
do $$
declare dt text;
begin
  select data_type into dt
  from information_schema.columns
  where table_schema='public' and table_name='pay_run_employees' and column_name='employee_id';

  if dt is null then
    -- Column missing for some reason: create the correct one
    alter table public.pay_run_employees add column employee_id uuid;
  elsif dt <> 'uuid' then
    -- Rename legacy text column, add new uuid column
    alter table public.pay_run_employees rename column employee_id to employee_legacy_id;
    alter table public.pay_run_employees add column employee_id uuid;

    -- 3) Backfill from employees.employee_id (text) when available
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='employees' and column_name='employee_id'
    ) then
      update public.pay_run_employees pr
      set employee_id = e.id
      from public.employees e
      where pr.employee_id is null
        and pr.employee_legacy_id = e.employee_id;
    end if;

    -- 4) Fallback: match when legacy equals employees.id as text
    update public.pay_run_employees pr
    set employee_id = e.id
    from public.employees e
    where pr.employee_id is null
      and pr.employee_legacy_id = e.id::text;
  end if;
end $$;

-- 5) Recreate FK to point at employees.id
alter table public.pay_run_employees
  add constraint pay_run_employees_employee_id_fkey
  foreign key (employee_id) references public.employees(id) on delete restrict;

-- 6) If everything is mapped, enforce NOT NULL. Otherwise leave nullable so you can fix rows manually.
do $$
declare unmapped int;
begin
  select count(*) into unmapped
  from public.pay_run_employees
  where employee_id is null;

  if unmapped = 0 then
    alter table public.pay_run_employees alter column employee_id set not null;
  end if;
end $$;

-- 7) Drop legacy column if it still exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pay_run_employees' and column_name='employee_legacy_id'
  ) then
    alter table public.pay_run_employees drop column employee_legacy_id;
  end if;
end $$;

-- 8) Drop employees.employee_id only if nothing references it anymore
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employees' and column_name='employee_id'
  ) then
    if not exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_attribute a on a.attrelid = t.oid and a.attnum = any(c.conkey)
      where c.contype = 'f'
        and c.confrelid = 'public.employees'::regclass
        and a.attname = 'employee_id'
    ) then
      alter table public.employees drop column employee_id;
    end if;
  end if;
end $$;
