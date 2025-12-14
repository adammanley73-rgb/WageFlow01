-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251210000000_add_employee_starters.sql

-- Create the employee_starters table to hold P45 / starter details, address, and loan flags
create table if not exists public.employee_starters (
  employee_id uuid not null references public.employees(id) on delete cascade,
  p45_provided boolean,
  starter_declaration text check (starter_declaration in ('A','B','C')),
  student_loan_plan text check (student_loan_plan in ('plan1','plan2','plan4','plan5')),
  postgraduate_loan boolean,
  address_line1 text,
  address_line2 text,
  address_line3 text,
  postcode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_starters_pkey primary key (employee_id)
);

-- Turn on RLS
alter table public.employee_starters enable row level security;

-- Simple dev policies (we can tighten later)
create policy "dev_select_employee_starters"
  on public.employee_starters
  for select
  using (true);

create policy "dev_insert_employee_starters"
  on public.employee_starters
  for insert
  with check (true);

create policy "dev_update_employee_starters"
  on public.employee_starters
  for update
  using (true)
  with check (true);

-- Keep updated_at in sync
create or replace function public.set_employee_starters_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_employee_starters_updated_at on public.employee_starters;

create trigger trg_employee_starters_updated_at
before update on public.employee_starters
for each row
execute procedure public.set_employee_starters_updated_at();
