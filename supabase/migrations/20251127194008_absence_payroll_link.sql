-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\YYYYMMDDHHMMSS_absence_payroll_link.sql
-- Link payroll_run_pay_elements to absences and absence_pay_schedules
-- so statutory / absence-driven rows are fully traceable.

alter table public.payroll_run_pay_elements
add column if not exists absence_id uuid
references public.absences(id)
on delete set null;

alter table public.payroll_run_pay_elements
add column if not exists absence_pay_schedule_id uuid
references public.absence_pay_schedules(id)
on delete set null;

-- Optional: index for quicker lookups by absence
create index if not exists payroll_run_pay_elements_absence_idx
on public.payroll_run_pay_elements (absence_id);

-- Optional: index for lookups by schedule
create index if not exists payroll_run_pay_elements_schedule_idx
on public.payroll_run_pay_elements (absence_pay_schedule_id);