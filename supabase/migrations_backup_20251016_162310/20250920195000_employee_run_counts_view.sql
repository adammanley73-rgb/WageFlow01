-- 20250920195000_employee_run_counts_view.sql
-- Recreate the view safely (no IF NOT EXISTS on CREATE VIEW)
drop view if exists public.employee_run_counts;

create view public.employee_run_counts as
select
  e.id as employee_id,
  coalesce(count(pre.employee_id), 0)::int as run_count
from public.employees e
left join public.pay_run_employees pre
  on pre.employee_id = e.id            -- if this errors, your pre.employee_id is text; see note below
group by e.id;
