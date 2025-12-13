-- 20251117233620_add_payroll_run_pay_date_trigger.sql
-- Purpose:
-- - Ensure payroll_runs.pay_date is always set using company pay schedule patterns
-- - Mark runs as overridden if pay_date is manually set or changed

alter table public.payroll_runs
add column if not exists pay_date date;

alter table public.payroll_runs
add column if not exists pay_date_overridden boolean not null default false;

create or replace function public.set_payroll_run_pay_date()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    -- If no pay_date is provided, use the pattern based suggestion
    if new.pay_date is null then
      new.pay_date := public.suggest_pay_date(
        new.company_id,
        new.frequency,
        new.period_start,
        new.period_end
      );
      new.pay_date_overridden := false;
    else
      -- User or code supplied a specific pay_date
      new.pay_date_overridden := true;
    end if;

  elsif tg_op = 'UPDATE' then
    -- If pay_date changes, mark as overridden
    if new.pay_date is distinct from old.pay_date then
      new.pay_date_overridden := true;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payroll_runs_pay_date
on public.payroll_runs;

create trigger trg_payroll_runs_pay_date
before insert or update on public.payroll_runs
for each row
execute function public.set_payroll_run_pay_date();
