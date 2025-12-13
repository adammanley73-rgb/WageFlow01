-- 20250920192700_employees_employee_id_default_uuid.sql
-- Goal: make inserts work by giving the legacy PK a default.
-- We DO NOT rename or drop constraints here.

create extension if not exists pgcrypto;

-- Ensure the real id column exists and has a default (harmless if already set)
alter table public.employees
  add column if not exists id uuid;
alter table public.employees
  alter column id set default gen_random_uuid();

-- Give employee_id a default so NOT NULL PK stops choking on inserts
do $$
declare coltype text;
begin
  select data_type into coltype
  from information_schema.columns
  where table_schema='public'
    and table_name='employees'
    and column_name='employee_id';

  if coltype is not null then
    if coltype = 'uuid' then
      alter table public.employees
        alter column employee_id set default gen_random_uuid();
    else
      -- likely text; cast the uuid to text
      alter table public.employees
        alter column employee_id set default gen_random_uuid()::text;
    end if;
  end if;
end
$$;
