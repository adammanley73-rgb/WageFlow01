-- 5) ONLY IF BOTH COUNTS = 0 → LOCK NOT NULL
-- supabase/migrations/20250930110000_company_id_not_null_step1.sql
do $$
declare
  v_emp int;
  v_runs int;
begin
  select count(*) into v_emp  from public.employees where company_id is null;
  select count(*) into v_runs from public.pay_runs  where company_id is null;

  if v_emp > 0 or v_runs > 0 then
    raise exception 'Backfill incomplete: employees_orphans=%, pay_runs_orphans=%', v_emp, v_runs;
  end if;

  alter table public.employees alter column company_id set not null;
  alter table public.pay_runs  alter column company_id set not null;
end
$$;
