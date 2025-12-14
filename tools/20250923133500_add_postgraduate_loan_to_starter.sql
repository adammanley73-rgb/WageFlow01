-- 20250923133500_add_postgraduate_loan_to_starter.sql
-- Add postgraduate_loan to employee_starter_details if it doesn't exist.
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'employee_starter_details'
      and column_name  = 'postgraduate_loan'
  ) then
    alter table public.employee_starter_details
      add column postgraduate_loan boolean not null default false;
  end if;
end $$;

-- Ensure a single row per employee for upsert(employee_id)
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'employee_starter_details_employee_id_key'
  ) then
    create unique index employee_starter_details_employee_id_key
      on public.employee_starter_details(employee_id);
  end if;
end $$;
