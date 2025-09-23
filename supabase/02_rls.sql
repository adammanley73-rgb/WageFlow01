-- supabase/02_rls.sql

-- Enable RLS
alter table public.companies enable row level security;
alter table public.user_company_memberships enable row level security;
alter table public.pay_schedules enable row level security;
alter table public.employees enable row level security;

-- Helpers: who am I
create or replace function public.current_user_id() returns uuid
language sql stable as $$
  select auth.uid();
$$;

-- Policies:
-- Membership table: a user can see only their rows; insert their own membership; no arbitrary deletes
drop policy if exists "ucm_select_own" on public.user_company_memberships;
create policy "ucm_select_own" on public.user_company_memberships
for select using (user_id = auth.uid());

drop policy if exists "ucm_insert_self" on public.user_company_memberships;
create policy "ucm_insert_self" on public.user_company_memberships
for insert with check (user_id = auth.uid());

-- Companies: allow select if the user has a membership
drop policy if exists "companies_select_member" on public.companies;
create policy "companies_select_member" on public.companies
for select using (
  exists (
    select 1 from public.user_company_memberships u
    where u.company_id = companies.id and u.user_id = auth.uid()
  )
);

-- Pay schedules: CRUD only within the user's company
drop policy if exists "ps_select_member" on public.pay_schedules;
create policy "ps_select_member" on public.pay_schedules
for select using (
  exists (
    select 1 from public.user_company_memberships u
    where u.company_id = pay_schedules.company_id and u.user_id = auth.uid()
  )
);

drop policy if exists "ps_modify_member" on public.pay_schedules;
create policy "ps_modify_member" on public.pay_schedules
for all using (
  exists (
    select 1 from public.user_company_memberships u
    where u.company_id = pay_schedules.company_id and u.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.user_company_memberships u
    where u.company_id = pay_schedules.company_id and u.user_id = auth.uid()
  )
);

-- Employees: CRUD only within the user's company
drop policy if exists "emp_select_member" on public.employees;
create policy "emp_select_member" on public.employees
for select using (
  exists (
    select 1 from public.user_company_memberships u
    where u.company_id = employees.company_id and u.user_id = auth.uid()
  )
);

drop policy if exists "emp_modify_member" on public.employees;
create policy "emp_modify_member" on public.employees
for all using (
  exists (
    select 1 from public.user_company_memberships u
    where u.company_id = employees.company_id and u.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.user_company_memberships u
    where u.company_id = employees.company_id and u.user_id = auth.uid()
  )
);

-- View: restrict by membership using a security definer wrapper
revoke all on public.employee_counts_by_company from anon, authenticated, service_role;

create or replace function public.my_employee_counts()
returns table(company_id uuid, total int)
language sql stable security definer as $$
  select ec.company_id, ec.total
  from public.employee_counts_by_company ec
  where exists (
    select 1 from public.user_company_memberships u
    where u.company_id = ec.company_id and u.user_id = auth.uid()
  );
$$;
grant execute on function public.my_employee_counts() to authenticated;
