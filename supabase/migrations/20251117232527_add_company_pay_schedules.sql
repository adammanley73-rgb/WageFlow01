-- 20251117190000_add_company_pay_schedules.sql
-- Purpose:
-- - Store per company pay date patterns for each frequency
-- - Support pattern v1: fixed day, last working day, last Friday, offsets
-- - Used when creating payroll runs to suggest pay_date

create table if not exists public.company_pay_schedules (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references public.companies(id) on delete cascade,

  -- weekly, fortnightly, four_weekly, monthly
  frequency text not null check (
    frequency in ('weekly', 'fortnightly', 'four_weekly', 'monthly')
  ),

  -- fixed_calendar_day, last_working_day, last_friday,
  -- offset_from_period_start, offset_from_period_end
  pay_date_mode text not null check (
    pay_date_mode in (
      'fixed_calendar_day',
      'last_working_day',
      'last_friday',
      'offset_from_period_start',
      'offset_from_period_end'
    )
  ),

  -- For fixed_calendar_day: 1..31
  -- For offset modes: number of days as integer (can be negative if required)
  pay_date_param_int integer,

  -- Whether user can override pay_date per run
  allow_override boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One schedule per company + frequency
create unique index if not exists company_pay_schedules_company_freq_idx
on public.company_pay_schedules (company_id, frequency);

-- Simple trigger to keep updated_at fresh
create or replace function public.set_company_pay_schedules_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_company_pay_schedules_updated_at
on public.company_pay_schedules;

create trigger trg_company_pay_schedules_updated_at
before update on public.company_pay_schedules
for each row
execute function public.set_company_pay_schedules_updated_at();
