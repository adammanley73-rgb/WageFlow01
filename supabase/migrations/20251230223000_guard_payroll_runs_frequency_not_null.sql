begin;

-- Make sure no legacy NULLs exist before constraint change
update public.payroll_runs
set frequency = 'monthly'
where frequency is null or btrim(frequency) = '';

-- Enforce at DB level
alter table public.payroll_runs
  alter column frequency set not null;

commit;
