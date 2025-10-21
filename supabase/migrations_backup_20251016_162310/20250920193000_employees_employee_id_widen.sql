-- 20250920193000_employees_employee_id_widen.sql
-- Widen legacy PK so gen_random_uuid()::text (36 chars) fits.

create extension if not exists pgcrypto;

-- Keep the PK, just change its type to something that fits.
-- text is safest; varchar(36) also works. We'll use text.
alter table public.employees
  alter column employee_id type text using employee_id::text;

-- Ensure default remains a UUID string
alter table public.employees
  alter column employee_id set default (gen_random_uuid())::text;
