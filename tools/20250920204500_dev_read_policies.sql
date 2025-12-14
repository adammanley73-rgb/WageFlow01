-- Allow simple SELECTs in dev so client pages don't 404 when RLS blocks reads.
-- Safe to keep in dev; remove or tighten for prod.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employees' and policyname = 'employees_dev_select'
  ) then
    create policy employees_dev_select
      on public.employees
      for select
      using (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'employee_starter_details'
      and policyname = 'esd_dev_select'
  ) then
    create policy esd_dev_select
      on public.employee_starter_details
      for select
      using (true);
  end if;
end$$;
