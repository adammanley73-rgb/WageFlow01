-- 20250920170000_employees_add_ni_number.sql

-- 1) Add ni_number if it doesn't exist
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_name = 'employees' and column_name = 'ni_number'
  ) then
    alter table public.employees
      add column ni_number text;
  end if;
end $$;

-- 2) Basic normalization on write (UPPERCASE, trim) via trigger
create or replace function public.fn_employees_normalize()
returns trigger
language plpgsql
as $$
begin
  if new.ni_number is not null then
    new.ni_number := upper(btrim(new.ni_number));
  end if;
  return new;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_employees_normalize'
  ) then
    create trigger trg_employees_normalize
    before insert or update on public.employees
    for each row execute function public.fn_employees_normalize();
  end if;
end $$;

-- 3) Optional uniqueness scoped to company to avoid dup NIs inside the same company
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'uq_employees_company_ni'
  ) then
    create unique index uq_employees_company_ni
      on public.employees (company_id, ni_number)
      where ni_number is not null;
  end if;
end $$;
