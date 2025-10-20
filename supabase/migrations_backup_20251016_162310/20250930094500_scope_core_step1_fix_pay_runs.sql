-- supabase/migrations/20250930094500_scope_core_step1_fix_pay_runs.sql
do $$
begin
  -- ensure column exists (harmless if already there)
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pay_runs' and column_name = 'company_id'
  ) then
    alter table public.pay_runs add column company_id uuid;
  end if;

  -- add FK if missing
  if not exists (
    select 1 from pg_constraint where conname = 'pay_runs_company_id_fkey'
  ) then
    alter table public.pay_runs
      add constraint pay_runs_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  -- add index if missing
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'i' and c.relname = 'idx_pay_runs_company_id'
  ) then
    create index idx_pay_runs_company_id on public.pay_runs(company_id);
  end if;
end
$$;
