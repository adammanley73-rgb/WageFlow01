-- supabase/migrations/20250930095500_scope_core_step1_fix_employees.sql
do $$
begin
  -- ensure column exists (if not already added)
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'employees' and column_name = 'company_id'
  ) then
    alter table public.employees add column company_id uuid;
  end if;

  -- add FK if missing
  if not exists (
    select 1 from pg_constraint where conname = 'employees_company_id_fkey'
  ) then
    alter table public.employees
      add constraint employees_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  -- add index if missing
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'i' and c.relname = 'idx_employees_company_id'
  ) then
    create index idx_employees_company_id on public.employees(company_id);
  end if;
end
$$;
