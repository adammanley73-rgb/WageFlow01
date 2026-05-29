-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20260118091500_restore_demo_company_memberships.sql
-- Purpose: Restore the minimal Companies + Memberships model required by:
-- - /dashboard/companies (Company Selection) -> queries public.vw_member_companies
-- - ActiveCompanyBanner -> queries public.companies(id,name)
-- Guarded because Supabase Preview may replay this migration before public.companies exists.

do $$
begin
  if to_regclass('public.companies') is not null then
    alter table public.companies
    add column if not exists name text;
  end if;
end $$;

create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id_uuid uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_memberships_company_user_unique unique (company_id, user_id_uuid)
);

do $$
begin
  if to_regclass('public.companies') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'company_memberships_company_id_fkey'
    ) then
      alter table public.company_memberships
      add constraint company_memberships_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete cascade;
    end if;
  end if;
end $$;

alter table public.company_memberships enable row level security;

drop policy if exists "company_memberships_select_own" on public.company_memberships;

create policy "company_memberships_select_own"
on public.company_memberships
for select
to authenticated
using (user_id_uuid = auth.uid());

drop policy if exists "company_memberships_insert_own" on public.company_memberships;

create policy "company_memberships_insert_own"
on public.company_memberships
for insert
to authenticated
with check (user_id_uuid = auth.uid());

do $$
begin
  if to_regclass('public.companies') is not null then
    drop view if exists public.vw_member_companies;

    execute '
      create or replace view public.vw_member_companies as
      select distinct
        c.id,
        c.name,
        c.created_at,
        m.user_id_uuid
      from public.companies c
      join public.company_memberships m on m.company_id = c.id
      where m.user_id_uuid = auth.uid()
    ';

    grant select on public.vw_member_companies to authenticated;
    grant select on public.companies to authenticated;
  end if;
end $$;

grant select, insert on public.company_memberships to authenticated;