-- 20251001090000_multi_company.sql (patched)
-- Multi-company schema for bureaus/accountants (Option 1)
-- Idempotent / safe re-run. No data seeding from companies.created_by.

-- 0) Common helper: updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  paye_reference text,
  accounts_office_reference text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger (create idempotently)
drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
before update on public.companies
for each row execute procedure public.set_updated_at();

-- 2) Company members: who has access to each company
create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id    uuid not null,
  role       text not null check (role in ('owner', 'admin', 'user', 'viewer')),
  added_by   uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

-- updated_at trigger
drop trigger if exists trg_company_members_updated_at on public.company_members;
create trigger trg_company_members_updated_at
before update on public.company_members
for each row execute procedure public.set_updated_at();

-- Useful indexes
create unique index if not exists company_members_pk_idx
  on public.company_members (company_id, user_id);
create index if not exists company_members_user_idx
  on public.company_members (user_id);

-- 3) Bootstrap: when someone INSERTs a company, automatically add them as owner.
--    (This replaces any reliance on companies.created_by.)
create or replace function public.companies_add_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  -- Only add if we have an authenticated user
  v_user := auth.uid();
  if v_user is not null then
    -- Insert owner membership if it doesn't already exist
    insert into public.company_members (company_id, user_id, role, added_by)
    values (new.id, v_user, 'owner', v_user)
    on conflict (company_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_companies_add_owner on public.companies;
create trigger trg_companies_add_owner
after insert on public.companies
for each row execute procedure public.companies_add_owner();

-- 4) Row Level Security (RLS)

-- Companies RLS
alter table public.companies enable row level security;

-- Recreate policies idempotently
drop policy if exists "companies_select_if_member" on public.companies;
drop policy if exists "companies_insert_if_authenticated" on public.companies;
drop policy if exists "companies_update_if_owner_or_admin" on public.companies;
drop policy if exists "companies_delete_if_owner" on public.companies;

-- SELECT: any member (any role) of the company
create policy "companies_select_if_member"
on public.companies
for select
using (
  exists (
    select 1
    from public.company_members m
    where m.company_id = companies.id
      and m.user_id = auth.uid()
  )
);

-- INSERT: any authenticated user may create a new company
-- (the AFTER INSERT trigger adds them as 'owner')
create policy "companies_insert_if_authenticated"
on public.companies
for insert
with check (auth.uid() is not null);

-- UPDATE: owners or admins only
create policy "companies_update_if_owner_or_admin"
on public.companies
for update
using (
  exists (
    select 1 from public.company_members m
    where m.company_id = companies.id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.company_members m
    where m.company_id = companies.id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

-- DELETE: owners only
create policy "companies_delete_if_owner"
on public.companies
for delete
using (
  exists (
    select 1 from public.company_members m
    where m.company_id = companies.id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  )
);

-- Company members RLS
alter table public.company_members enable row level security;

drop policy if exists "members_select_if_member" on public.company_members;
drop policy if exists "members_insert_if_owner_or_admin" on public.company_members;
drop policy if exists "members_update_if_owner" on public.company_members;
drop policy if exists "members_delete_if_owner_or_self" on public.company_members;

-- SELECT: visible to members of the same company
create policy "members_select_if_member"
on public.company_members
for select
using (
  exists (
    select 1 from public.company_members me
    where me.company_id = company_members.company_id
      and me.user_id = auth.uid()
  )
);

-- INSERT: only owners/admins of that company can add members
create policy "members_insert_if_owner_or_admin"
on public.company_members
for insert
with check (
  exists (
    select 1 from public.company_members me
    where me.company_id = company_members.company_id
      and me.user_id = auth.uid()
      and me.role in ('owner','admin')
  )
);

-- UPDATE: only owners can change roles/memberships
create policy "members_update_if_owner"
on public.company_members
for update
using (
  exists (
    select 1 from public.company_members me
    where me.company_id = company_members.company_id
      and me.user_id = auth.uid()
      and me.role = 'owner'
  )
)
with check (
  exists (
    select 1 from public.company_members me
    where me.company_id = company_members.company_id
      and me.user_id = auth.uid()
      and me.role = 'owner'
  )
);

-- DELETE: owners can remove anyone; any user can remove themselves
create policy "members_delete_if_owner_or_self"
on public.company_members
for delete
using (
  exists (
    select 1 from public.company_members me
    where me.company_id = company_members.company_id
      and me.user_id = auth.uid()
      and me.role = 'owner'
  )
  or company_members.user_id = auth.uid()
);

-- 5) (Optional) Relax NOT NULLs defensively (safe no-op if already nullable)
do $$
begin
  -- If any column constraints changed earlier, make sure we don't fail
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='companies'
               and column_name='paye_reference') then
    execute 'alter table public.companies alter column paye_reference drop not null';
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='companies'
               and column_name='accounts_office_reference') then
    execute 'alter table public.companies alter column accounts_office_reference drop not null';
  end if;
end
$$;
