-- 20250930093500_company_settings_cleanup_v2.sql
-- Cleanup company_settings: remove stale NOT NULLs, enforce requireds

-- 1. Ensure required columns are NOT NULL
alter table public.company_settings
  alter column company_name set not null;

do $$
begin
  if not exists (select 1 from public.company_settings where created_by is null) then
    alter table public.company_settings alter column created_by set not null;
  end if;
end$$;

-- 2. Relax unnecessary NOT NULLs
alter table public.company_settings
  alter column paye_reference drop not null,
  alter column accounts_office_reference drop not null,
  alter column pay_calendar drop not null;

-- 3. Recreate index if needed
create unique index if not exists company_settings_created_by_uidx
  on public.company_settings (created_by);
