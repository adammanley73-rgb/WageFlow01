-- 20250930091500_company_settings_fix.sql
-- Patch company_settings so it matches expected schema and RLS

-- Ensure table exists (no-op if already there)
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,
  company_name text,
  paye_reference text,
  accounts_office_reference text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  country text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill missing columns defensively
alter table public.company_settings add column if not exists created_by uuid;
alter table public.company_settings add column if not exists company_name text;
alter table public.company_settings add column if not exists paye_reference text;
alter table public.company_settings add column if not exists accounts_office_reference text;
alter table public.company_settings add column if not exists address_line1 text;
alter table public.company_settings add column if not exists address_line2 text;
alter table public.company_settings add column if not exists city text;
alter table public.company_settings add column if not exists postcode text;
alter table public.company_settings add column if not exists country text;
alter table public.company_settings add column if not exists contact_name text;
alter table public.company_settings add column if not exists contact_email text;
alter table public.company_settings add column if not exists contact_phone text;
alter table public.company_settings add column if not exists created_at timestamptz not null default now();
alter table public.company_settings add column if not exists updated_at timestamptz not null default now();

-- Only enforce NOT NULL if there are no rows with null created_by
do $$
begin
  if not exists (select 1 from public.company_settings where created_by is null) then
    alter table public.company_settings alter column created_by set not null;
  end if;
end$$;

-- Recreate index idempotently
create unique index if not exists company_settings_created_by_uidx
  on public.company_settings (created_by);

-- Enable RLS and (re)create policies
alter table public.company_settings enable row level security;

drop policy if exists "Select own settings" on public.company_settings;
create policy "Select own settings"
on public.company_settings
for select
using (auth.uid() = created_by);

drop policy if exists "Insert own settings" on public.company_settings;
create policy "Insert own settings"
on public.company_settings
for insert
with check (auth.uid() = created_by);

drop policy if exists "Update own settings" on public.company_settings;
create policy "Update own settings"
on public.company_settings
for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Delete own settings" on public.company_settings;
create policy "Delete own settings"
on public.company_settings
for delete
using (auth.uid() = created_by);

-- Ensure updated_at trigger function exists
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_company_settings_updated_at on public.company_settings;
create trigger trg_company_settings_updated_at
before update on public.company_settings
for each row execute procedure public.set_updated_at();
