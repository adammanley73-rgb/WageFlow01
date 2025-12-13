-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\YYYYMMDDHHMMSS_absence_core.sql

-- 1) Core absences table
create table public.absences (
id uuid primary key default gen_random_uuid(),
company_id uuid not null references public.companies(id) on delete cascade,
employee_id uuid not null references public.employees(id) on delete cascade,
type text not null,
status text not null default 'draft',
first_day date not null,
last_day_expected date,
last_day_actual date,
reference_notes text,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);

create index absences_company_employee_idx
on public.absences (company_id, employee_id);

create index absences_company_type_status_idx
on public.absences (company_id, type, status);

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

-- 2) Sickness periods for SSP logic
create table public.sickness_periods (
id uuid primary key default gen_random_uuid(),
absence_id uuid not null references public.absences(id) on delete cascade,
company_id uuid not null references public.companies(id) on delete cascade,
employee_id uuid not null references public.employees(id) on delete cascade,
start_date date not null,
end_date date not null,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);

create index sickness_periods_company_employee_idx
on public.sickness_periods (company_id, employee_id);

create index sickness_periods_employee_start_idx
on public.sickness_periods (employee_id, start_date);

-- 3) Absence pay schedules (bridge into payroll)
create table public.absence_pay_schedules (
id uuid primary key default gen_random_uuid(),
absence_id uuid not null references public.absences(id) on delete cascade,
company_id uuid not null references public.companies(id) on delete cascade,
employee_id uuid not null references public.employees(id) on delete cascade,
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

create index absence_pay_schedules_company_employee_period_idx
on public.absence_pay_schedules (
company_id,
employee_id,
pay_period_start,
pay_period_end
);

create index absence_pay_schedules_absence_idx
on public.absence_pay_schedules (absence_id);

create index absence_pay_schedules_company_element_idx
on public.absence_pay_schedules (company_id, element_code);