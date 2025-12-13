-- 20251121170000_add_employee_number_and_phone.sql

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS employee_number text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS pay_basis text;