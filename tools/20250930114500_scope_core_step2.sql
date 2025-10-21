-- supabase/migrations/20250930114500_scope_core_step2.sql
-- Add company_id to pay_run_employees, payroll_entries, rti_logs (idempotent),
-- plus FK to companies and an index for each.

do $$
begin
  -- helper to create column+fk+index if missing
  perform 1;

  -- pay_run_employees
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='pay_run_employees') then
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='pay_run_employees' and column_name='company_id'
    ) then
      alter table public.pay_run_employees add column company_id uuid;
    end if;

    if not exists (select 1 from pg_constraint where conname='pay_run_employees_company_id_fkey') then
      alter table public.pay_run_employees
        add constraint pay_run_employees_company_id_fkey
        foreign key (company_id) references public.companies(id) on delete cascade;
    end if;

    if not exists (
      select 1
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='i' and c.relname='idx_pay_run_employees_company_id'
    ) then
      create index idx_pay_run_employees_company_id on public.pay_run_employees(company_id);
    end if;
  end if;

  -- payroll_entries
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='payroll_entries') then
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='payroll_entries' and column_name='company_id'
    ) then
      alter table public.payroll_entries add column company_id uuid;
    end if;

    if not exists (select 1 from pg_constraint where conname='payroll_entries_company_id_fkey') then
      alter table public.payroll_entries
        add constraint payroll_entries_company_id_fkey
        foreign key (company_id) references public.companies(id) on delete cascade;
    end if;

    if not exists (
      select 1
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='i' and c.relname='idx_payroll_entries_company_id'
    ) then
      create index idx_payroll_entries_company_id on public.payroll_entries(company_id);
    end if;
  end if;

  -- rti_logs
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='rti_logs') then
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='rti_logs' and column_name='company_id'
    ) then
      alter table public.rti_logs add column company_id uuid;
    end if;

    if not exists (select 1 from pg_constraint where conname='rti_logs_company_id_fkey') then
      alter table public.rti_logs
        add constraint rti_logs_company_id_fkey
        foreign key (company_id) references public.companies(id) on delete cascade;
    end if;

    if not exists (
      select 1
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='i' and c.relname='idx_rti_logs_company_id'
    ) then
      create index idx_rti_logs_company_id on public.rti_logs(company_id);
    end if;
  end if;
end
$$;
