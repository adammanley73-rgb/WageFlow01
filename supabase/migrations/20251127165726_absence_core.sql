-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\YYYYMMDDHHMMSS_absence_core.sql
-- Guarded because Supabase Preview may replay this migration before public.companies exists.

create table if not exists public.absences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  employee_id uuid not null,
  type text not null,
  status text not null default 'draft',
  first_day date not null,
  last_day_expected date,
  last_day_actual date,
  reference_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists absences_company_employee_idx
on public.absences (company_id, employee_id);

create index if not exists absences_company_type_status_idx
on public.absences (company_id, type, status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'absences_type_check'
  ) then
    alter table public.absences
    add constraint absences_type_check
    check (
      type in (
        'sickness',
        'maternity',
        'adoption',
        'paternity',
        'shared_parental',
        'parental_bereavement',
        'neonatal_care',
        'parental_leave',
        'carers_leave',
        'annual_leave',
        'unpaid_other'
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'absences_status_check'
  ) then
    alter table public.absences
    add constraint absences_status_check
    check (
      status in (
        'draft',
        'scheduled',
        'active',
        'completed',
        'cancelled'
      )
    );
  end if;
end $$;

do $$
begin
  if to_regclass('public.companies') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'absences_company_id_fkey'
    ) then
      alter table public.absences
      add constraint absences_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete cascade;
    end if;
  end if;

  if to_regclass('public.employees') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'absences_employee_id_fkey'
    ) then
      alter table public.absences
      add constraint absences_employee_id_fkey
      foreign key (employee_id)
      references public.employees(id)
      on delete cascade;
    end if;
  end if;
end $$;

create table if not exists public.sickness_periods (
  id uuid primary key default gen_random_uuid(),
  absence_id uuid not null,
  company_id uuid not null,
  employee_id uuid not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sickness_periods_company_employee_idx
on public.sickness_periods (company_id, employee_id);

create index if not exists sickness_periods_employee_start_idx
on public.sickness_periods (employee_id, start_date);

do $$
begin
  if to_regclass('public.absences') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'sickness_periods_absence_id_fkey'
    ) then
      alter table public.sickness_periods
      add constraint sickness_periods_absence_id_fkey
      foreign key (absence_id)
      references public.absences(id)
      on delete cascade;
    end if;
  end if;

  if to_regclass('public.companies') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'sickness_periods_company_id_fkey'
    ) then
      alter table public.sickness_periods
      add constraint sickness_periods_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete cascade;
    end if;
  end if;

  if to_regclass('public.employees') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'sickness_periods_employee_id_fkey'
    ) then
      alter table public.sickness_periods
      add constraint sickness_periods_employee_id_fkey
      foreign key (employee_id)
      references public.employees(id)
      on delete cascade;
    end if;
  end if;
end $$;

create table if not exists public.absence_pay_schedules (
  id uuid primary key default gen_random_uuid(),
  absence_id uuid not null,
  company_id uuid not null,
  employee_id uuid not null,
  pay_period_start date not null,
  pay_period_end date not null,
  payroll_frequency text not null,
  element_code text not null,
  amount numeric(12,2) not null,
  taxable_for_paye boolean not null default true,
  nic_earnings boolean not null default true,
  pensionable boolean not null default false,
  ae_qualifying boolean not null default false,
  is_offset_against_statutory boolean not null default false,
  source_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists absence_pay_schedules_company_employee_period_idx
on public.absence_pay_schedules (
  company_id,
  employee_id,
  pay_period_start,
  pay_period_end
);

create index if not exists absence_pay_schedules_absence_idx
on public.absence_pay_schedules (absence_id);

create index if not exists absence_pay_schedules_company_element_idx
on public.absence_pay_schedules (company_id, element_code);

do $$
begin
  if to_regclass('public.absences') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'absence_pay_schedules_absence_id_fkey'
    ) then
      alter table public.absence_pay_schedules
      add constraint absence_pay_schedules_absence_id_fkey
      foreign key (absence_id)
      references public.absences(id)
      on delete cascade;
    end if;
  end if;

  if to_regclass('public.companies') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'absence_pay_schedules_company_id_fkey'
    ) then
      alter table public.absence_pay_schedules
      add constraint absence_pay_schedules_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete cascade;
    end if;
  end if;

  if to_regclass('public.employees') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'absence_pay_schedules_employee_id_fkey'
    ) then
      alter table public.absence_pay_schedules
      add constraint absence_pay_schedules_employee_id_fkey
      foreign key (employee_id)
      references public.employees(id)
      on delete cascade;
    end if;
  end if;
end $$;