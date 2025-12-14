-- supabase/migrations/20250930120000_backfill_and_lock_step2.sql
-- Backfill company_id for payroll_entries and rti_logs using related rows.
-- Then set NOT NULL when safe. Idempotent, defensive.

do $$
declare
  v_entries_orphans int := null;
  v_rti_orphans int := null;
  has_payroll_entries bool := false;
  has_rti_logs bool := false;
  entries_has_col bool := false;
  rti_has_col bool := false;
  entries_has_pay_run_id bool := false;
  entries_has_employee_id bool := false;
  rti_has_pay_run_id bool := false;
begin
  -- existence checks
  select exists (select 1 from information_schema.tables where table_schema='public' and table_name='payroll_entries')
    into has_payroll_entries;
  select exists (select 1 from information_schema.tables where table_schema='public' and table_name='rti_logs')
    into has_rti_logs;

  -- ensure company_id columns exist
  if has_payroll_entries then
    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='payroll_entries' and column_name='company_id'
    ) into entries_has_col;

    if not entries_has_col then
      alter table public.payroll_entries add column company_id uuid;
      alter table public.payroll_entries
        add constraint payroll_entries_company_id_fkey
        foreign key (company_id) references public.companies(id) on delete cascade;
      create index if not exists idx_payroll_entries_company_id on public.payroll_entries(company_id);
    end if;

    -- discover linkage columns
    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='payroll_entries' and column_name='pay_run_id'
    ) into entries_has_pay_run_id;

    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='payroll_entries' and column_name='employee_id'
    ) into entries_has_employee_id;

    -- backfill via pay_run_id -> pay_runs.company_id
    if entries_has_pay_run_id then
      update public.payroll_entries pe
      set company_id = pr.company_id
      from public.pay_runs pr
      where pe.company_id is null
        and pe.pay_run_id = pr.id
        and pr.company_id is not null;
    end if;

    -- if still null, backfill via employee_id -> employees.company_id
    if entries_has_employee_id then
      update public.payroll_entries pe
      set company_id = e.company_id
      from public.employees e
      where pe.company_id is null
        and pe.employee_id = e.id
        and e.company_id is not null;
    end if;

    -- count remaining orphans
    select count(*) into v_entries_orphans
    from public.payroll_entries where company_id is null;

    -- set NOT NULL only if safe
    if v_entries_orphans = 0 then
      begin
        alter table public.payroll_entries alter column company_id set not null;
      exception when others then
        raise notice 'Could not set payroll_entries.company_id NOT NULL: %', sqlerrm;
      end;
    else
      raise notice 'payroll_entries backfill incomplete: % orphan rows remain', v_entries_orphans;
    end if;
  end if;

  if has_rti_logs then
    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='rti_logs' and column_name='company_id'
    ) into rti_has_col;

    if not rti_has_col then
      alter table public.rti_logs add column company_id uuid;
      alter table public.rti_logs
        add constraint rti_logs_company_id_fkey
        foreign key (company_id) references public.companies(id) on delete cascade;
      create index if not exists idx_rti_logs_company_id on public.rti_logs(company_id);
    end if;

    -- detect pay_run_id on rti_logs
    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='rti_logs' and column_name='pay_run_id'
    ) into rti_has_pay_run_id;

    -- backfill from pay_runs if joined
    if rti_has_pay_run_id then
      update public.rti_logs rl
      set company_id = pr.company_id
      from public.pay_runs pr
      where rl.company_id is null
        and rl.pay_run_id = pr.id
        and pr.company_id is not null;
    end if;

    -- final orphan count
    select count(*) into v_rti_orphans
    from public.rti_logs where company_id is null;

    -- set NOT NULL only if safe
    if v_rti_orphans = 0 then
      begin
        alter table public.rti_logs alter column company_id set not null;
      exception when others then
        raise notice 'Could not set rti_logs.company_id NOT NULL: %', sqlerrm;
      end;
    else
      raise notice 'rti_logs backfill incomplete: % orphan rows remain', v_rti_orphans;
    end if;
  end if;
end
$$;
