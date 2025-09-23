-- 20250920180500_employees_add_missing_columns.sql
-- Add the baseline columns New/Edit/List expect. All IF NOT EXISTS.

-- touch helper (idempotent)
create or replace function public.fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- Columns
alter table public.employees
  add column if not exists first_name      text,
  add column if not exists last_name       text,
  add column if not exists ni_number       text,
  add column if not exists pay_type        text check (pay_type in ('salary','hourly')) default 'salary',
  add column if not exists base_pay        numeric(12,2),
  add column if not exists frequency       text check (frequency in ('weekly','fortnightly','fourweekly','monthly')) default 'monthly',
  add column if not exists hours_per_week  numeric(6,2),
  add column if not exists company_id      uuid,
  add column if not exists created_at      timestamptz not null default now(),
  add column if not exists updated_at      timestamptz not null default now();

-- helpful index for scoping
create index if not exists idx_employees_company on public.employees(company_id);

-- updated_at trigger (safe re-create)
drop trigger if exists trg_employees_touch on public.employees;
create trigger trg_employees_touch
before update on public.employees
for each row execute function public.fn_touch_updated_at();

-- Ensure id is unique to satisfy FKs from child tables
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.employees'::regclass
      and contype in ('p','u')
      and conname = 'uq_employees_id'
  ) then
    alter table public.employees
      add constraint uq_employees_id unique (id);
  end if;
end $$;
