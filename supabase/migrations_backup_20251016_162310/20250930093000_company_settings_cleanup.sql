-- 20250930093000_company_settings_cleanup.sql (patched)
-- Normalize company_settings table (defensive, idempotent)

do $$
begin
  -- Backfill + drop only if the stray column exists
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'company_settings'
      and column_name  = 'accounts_office_ref'
  ) then
    execute $sql$
      update public.company_settings
      set accounts_office_reference = coalesce(accounts_office_reference, accounts_office_ref)
      where accounts_office_ref is not null
    $sql$;

    execute 'alter table public.company_settings drop column accounts_office_ref';
  end if;

  -- If pay_calendar exists, relax NOT NULL (safe no-op if already nullable)
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'company_settings'
      and column_name  = 'pay_calendar'
  ) then
    execute 'alter table public.company_settings alter column pay_calendar drop not null';
  end if;
end
$$;
