begin;

-- Normalize any legacy casing/spacing just in case.
update public.payroll_runs
set frequency = lower(btrim(frequency))
where frequency is not null;

-- Fail fast if any invalid values exist before adding the constraint.
do $$
begin
  if exists (
    select 1
    from public.payroll_runs
    where frequency not in ('weekly', 'fortnightly', 'four_weekly', 'monthly')
  ) then
    raise exception 'Invalid payroll_runs.frequency values exist. Fix them before applying the check constraint.';
  end if;
end
$$;

-- Add the constraint if it doesn't already exist.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'payroll_runs'
      and c.conname = 'payroll_runs_frequency_check'
  ) then
    execute $sql$
      alter table public.payroll_runs
      add constraint payroll_runs_frequency_check
      check (frequency in ('weekly', 'fortnightly', 'four_weekly', 'monthly'))
    $sql$;
  end if;
end
$$;

commit;
