-- Add missing columns to payroll_runs table
-- Guarded because Supabase Preview may replay this migration before public.payroll_runs or public.companies exists.

do $$
begin
  if to_regclass('public.payroll_runs') is not null then
    execute 'alter table public.payroll_runs add column if not exists status text';

    execute 'update public.payroll_runs set status = coalesce(status, ''draft'') where status is null';

    execute 'alter table public.payroll_runs alter column status set default ''draft''';

    if to_regclass('public.companies') is not null then
      if not exists (
        select 1
        from pg_constraint
        where conname = 'payroll_runs_company_id_fkey'
      ) then
        execute 'alter table public.payroll_runs add constraint payroll_runs_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade';
      end if;
    end if;

    execute 'create index if not exists idx_payroll_runs_status on public.payroll_runs (status)';

    execute 'create index if not exists idx_payroll_runs_pay_date on public.payroll_runs (pay_date)';
  end if;
end $$;