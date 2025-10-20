-- supabase/migrations/20250930123000_backfill_and_lock_rti_only.sql
do $$
declare
  has_rti_logs bool := false;
  rti_has_col bool := false;
  rti_has_pay_run_id bool := false;
  v_rti_orphans int := null;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='rti_logs'
  ) into has_rti_logs;

  if not has_rti_logs then
    raise notice 'public.rti_logs not found. Nothing to do.';
    return;
  end if;

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

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='rti_logs' and column_name='pay_run_id'
  ) into rti_has_pay_run_id;

  if rti_has_pay_run_id then
    update public.rti_logs rl
    set company_id = pr.company_id
    from public.pay_runs pr
    where rl.company_id is null
      and rl.pay_run_id = pr.id
      and pr.company_id is not null;
  end if;

  select count(*) into v_rti_orphans
  from public.rti_logs where company_id is null;

  if v_rti_orphans = 0 then
    alter table public.rti_logs alter column company_id set not null;
  else
    raise notice 'rti_logs backfill incomplete: % orphan rows remain', v_rti_orphans;
  end if;
end
$$;
