-- C:\Projects\wageflow01\supabase\migrations\20260429000100_cleanup_legacy_public_tables.sql
--
-- Purpose:
-- Archive and remove legacy public tables that are no longer used by active WageFlow app code.
--
-- Manual live cleanup already completed on 2026-04-29.
-- This migration records the cleanup so repo history and future database builds stay aligned.
--
-- Archived non-empty tables:
-- - company_settings_backup
-- - host_profiles
--
-- Dropped legacy tables:
-- - employee_p45_details
-- - pay_items
-- - pay_results
-- - payslips
-- - absence_requests
-- - age_verifications
-- - host_profiles
-- - company_settings_backup

create table if not exists public.legacy_cleanup_archive_20260429 (
  archived_at timestamp with time zone not null default now(),
  table_name text not null,
  row_data jsonb not null
);

alter table public.legacy_cleanup_archive_20260429 enable row level security;

do $$
begin
  if to_regclass('public.company_settings_backup') is not null then
    insert into public.legacy_cleanup_archive_20260429 (
      archived_at,
      table_name,
      row_data
    )
    select
      now(),
      'company_settings_backup',
      to_jsonb(t.*)
    from public.company_settings_backup t
    where not exists (
      select 1
      from public.legacy_cleanup_archive_20260429 a
      where a.table_name = 'company_settings_backup'
        and a.row_data = to_jsonb(t.*)
    );
  end if;

  if to_regclass('public.host_profiles') is not null then
    insert into public.legacy_cleanup_archive_20260429 (
      archived_at,
      table_name,
      row_data
    )
    select
      now(),
      'host_profiles',
      to_jsonb(t.*)
    from public.host_profiles t
    where not exists (
      select 1
      from public.legacy_cleanup_archive_20260429 a
      where a.table_name = 'host_profiles'
        and a.row_data = to_jsonb(t.*)
    );
  end if;
end $$;

drop table if exists public.employee_p45_details;
drop table if exists public.pay_items;
drop table if exists public.pay_results;
drop table if exists public.payslips;
drop table if exists public.absence_requests;
drop table if exists public.age_verifications;
drop table if exists public.host_profiles;
drop table if exists public.company_settings_backup;
