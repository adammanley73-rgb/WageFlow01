-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251122xxxxxx_payroll_runs_attach_trigger.sql
-- Trigger: whenever a new payroll_run row is inserted, automatically
--          attach all due employees based on company_id + frequency.
-- Guarded because Supabase Preview may replay this migration before public.payroll_runs exists.

create or replace function public.payroll_runs_after_insert_attach()
returns trigger
language plpgsql
as $$
begin
  perform public.attach_due_employees_to_run(new.id);
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.payroll_runs') is not null then
    drop trigger if exists payroll_runs_after_insert_attach on public.payroll_runs;

    create trigger payroll_runs_after_insert_attach
    after insert on public.payroll_runs
    for each row
    execute function public.payroll_runs_after_insert_attach();
  end if;
end $$;