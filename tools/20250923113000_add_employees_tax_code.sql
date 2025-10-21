-- 20250923113000_add_employees_tax_code.sql
-- Add tax_code to employees if not present, and backfill to a safe default.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employees' and column_name='tax_code'
  ) then
    alter table public.employees add column tax_code text;
    -- Optional backfill so existing rows aren't null
    update public.employees
      set tax_code = coalesce(tax_code, '1257L');
    create index if not exists idx_employees_tax_code on public.employees(tax_code);
  end if;
end $$;
