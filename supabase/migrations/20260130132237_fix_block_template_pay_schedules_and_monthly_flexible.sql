-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20260130132237_fix_block_template_pay_schedules_and_monthly_flexible.sql
-- Purpose:
-- 1) Prevent payroll_runs.pay_schedule_id from ever pointing at a template pay_schedules row.
-- 2) Ensure Monthly - Flexible (44444444...) is treated as a real schedule (is_template=false).
-- Guarded because Supabase Preview may replay this migration before public.payroll_runs exists.

create or replace function public.block_template_pay_schedules_on_runs()
returns trigger
language plpgsql
as $$
declare
  is_t boolean;
begin
  if new.pay_schedule_id is null then
    return new;
  end if;

  select ps.is_template
  into is_t
  from public.pay_schedules ps
  where ps.id = new.pay_schedule_id;

  if is_t is null then
    raise exception 'payroll_runs.pay_schedule_id (%) does not exist in pay_schedules', new.pay_schedule_id;
  end if;

  if is_t is true then
    raise exception 'payroll_runs.pay_schedule_id (%) points to a template pay_schedule, which is not allowed', new.pay_schedule_id;
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.payroll_runs') is not null then
    drop trigger if exists trg_block_template_pay_schedules_on_runs on public.payroll_runs;

    create trigger trg_block_template_pay_schedules_on_runs
    before insert or update of pay_schedule_id on public.payroll_runs
    for each row
    execute function public.block_template_pay_schedules_on_runs();
  end if;
end $$;

do $$
begin
  if to_regclass('public.pay_schedules') is not null then
    update public.pay_schedules
    set is_template = false
    where id = '44444444-4444-4444-4444-444444444444'::uuid;
  end if;
end $$;