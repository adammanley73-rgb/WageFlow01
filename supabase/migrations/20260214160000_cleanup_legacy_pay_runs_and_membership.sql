-- WageFlow legacy cleanup: pay_runs/pay_run_employees + legacy membership stack
-- Created: 2026-02-14
-- Safe to re-run (IF EXISTS + ALTER TABLE IF EXISTS)

begin;

-- 1) Drop legacy views tied to pay_runs/pay_run_employees
drop view if exists public.v_pay_run_totals;
drop view if exists public.employee_run_counts;

-- 2) Drop legacy FKs that referenced pay_runs/pay_run_employees
alter table if exists public.ai_alerts   drop constraint if exists ai_alerts_pay_run_id_fkey;
alter table if exists public.rti_logs    drop constraint if exists rti_logs_pay_run_id_fkey;
alter table if exists public.pay_items   drop constraint if exists pay_items_run_employee_id_fkey;
alter table if exists public.pay_results drop constraint if exists pay_results_run_employee_id_fkey;
alter table if exists public.pay_run_employees drop constraint if exists pay_run_employees_pay_run_id_fkey;

-- 3) Drop legacy tables
drop table if exists public.pay_run_employees;
drop table if exists public.pay_runs;

-- 4) Drop legacy membership view/functions/table (superseded by company_memberships)
drop view if exists public.company_members_norm;
drop function if exists public.is_company_member(uuid);
drop function if exists public.is_company_owner(uuid);
drop function if exists public.is_company_admin_or_owner(uuid);
drop table if exists public.company_members_legacy;

commit;