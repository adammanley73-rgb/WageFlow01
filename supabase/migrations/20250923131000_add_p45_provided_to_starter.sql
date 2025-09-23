-- 20250923131000_add_p45_provided_to_starter.sql
-- Add p45_provided to employee_starter_details if it's missing.
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'employee_starter_details'
      and column_name  = 'p45_provided'
  ) then
    alter table public.employee_starter_details
      add column p45_provided boolean not null default false;
  end if;
end $$;

-- Optional: make sure there's at most one row per employee (needed for upsert on employee_id).
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'employee_starter_details_employee_id_key'
  ) then
    -- create a unique index if a unique constraint doesn't already exist
    create unique index employee_starter_details_employee_id_key
      on public.employee_starter_details(employee_id);
  end if;
end $$;
