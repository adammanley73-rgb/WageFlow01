-- Ensure pay_run_employees has company_id BEFORE RLS policies run,
-- and backfill it safely regardless of what the run FK column is called.

-- 1) Add column if missing
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'pay_run_employees'
      and column_name  = 'company_id'
  ) then
    alter table public.pay_run_employees
      add column company_id uuid;
  end if;
end
$$;

-- 2) Backfill company_id from payroll_runs using whichever FK column exists
do $$
declare
  fk_col text;
begin
  select column_name
  into fk_col
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'pay_run_employees'
    and column_name in ('run_id','payroll_run_id','run')
  limit 1;

  if fk_col is not null then
    execute format($fmt$
      update public.pay_run_employees pre
      set company_id = pr.company_id
      from public.payroll_runs pr
      where pre.company_id is null
        and pre.%I = pr.id
    $fmt$, fk_col);
  end if;
end
$$;

-- 3) Set NOT NULL only if nothing is null after backfill
do $$
begin
  perform 1 from public.pay_run_employees where company_id is null limit 1;
  if not found then
    alter table public.pay_run_employees
      alter column company_id set not null;
  end if;
end
$$;

-- 4) Helpful index (idempotent)
create index if not exists idx_pre_company
  on public.pay_run_employees(company_id);
