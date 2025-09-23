-- supabase/03_seed.sql
-- 1) Create one company for your user
-- Replace 'YOUR-USER-UUID' with your actual auth.users.id
-- In SQL editor, you can read it with: select auth.uid();
-- If running as yourself in the editor while logged in, auth.uid() is your id.

insert into public.companies (name) values ('The Business Consortium Ltd')
on conflict do nothing;

-- Attach current user to that company
insert into public.user_company_memberships (user_id, company_id, role)
select auth.uid(), c.id, 'owner'
from public.companies c
where c.name = 'The Business Consortium Ltd'
on conflict do nothing;

-- Seed two pay schedules
insert into public.pay_schedules (company_id, code, label, frequency)
select c.id, 'monthly_salaried', 'Monthly salaried', 'monthly'
from public.companies c
where c.name = 'The Business Consortium Ltd'
on conflict do nothing;

insert into public.pay_schedules (company_id, code, label, frequency)
select c.id, 'weekly_hourly', 'Weekly hourly', 'weekly'
from public.companies c
where c.name = 'The Business Consortium Ltd'
on conflict do nothing;

-- Optional: seed one demo employee tied to this company
insert into public.employees (company_id, first_name, last_name, ni, pay_group, hourly_rate, weekly_hours)
select c.id, 'Adam', 'Manley', 'NY953184C', 'monthly_salaried', null, 37.5
from public.companies c
where c.name = 'The Business Consortium Ltd'
on conflict do nothing;
