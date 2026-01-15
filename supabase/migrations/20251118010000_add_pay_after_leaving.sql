-- 20251118010000_add_pay_after_leaving.sql
-- Purpose:
-- Add pay_after_leaving flag to run-employee attachment table.
-- This repo has evidence of a historical table name change:
--   - Older: public.pay_run_employees
--   - Newer: public.payroll_run_employees
-- Fresh demo databases may not have the older table, and/or the newer table may be created later.
-- This migration must never hard-fail, and must support both names.

alter table if exists public.pay_run_employees
  add column if not exists pay_after_leaving boolean not null default false;

alter table if exists public.payroll_run_employees
  add column if not exists pay_after_leaving boolean not null default false;