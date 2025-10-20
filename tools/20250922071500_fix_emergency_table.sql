-- Bring employee_emergency_contacts into the expected shape.
-- Idempotent: safely CREATE if missing, otherwise ADD any missing columns,
-- constraints, indexes, trigger and policies.

-- 1) Ensure table exists
do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name   = 'employee_emergency_contacts'
  ) then
    create table public.employee_emergency_contacts (
      id uuid primary key default gen_random_uuid(),
      employee_id uuid not null references public.employees(id) on delete cascade,
      company_id uuid not null,
      contact_name text not null,
      relationship text,
      phone text,
      email text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (employee_id)
    );
  end if;
end
$$;

-- 2) Add any missing columns
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_emergency_contacts' and column_name='employee_id'
  ) then
    alter table public.employee_emergency_contacts
      add column employee_id uuid not null references public.employees(id) on delete cascade;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_emergency_contacts' and column_name='company_id'
  ) then
    alter table public.employee_emergency_contacts
      add column company_id uuid;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_emergency_contacts' and column_name='contact_name'
  ) then
    alter table public.employee_emergency_contacts
      add column contact_name text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_emergency_contacts' and column_name='relationship'
  ) then
    alter table public.employee_emergency_contacts
      add column relationship text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_emergency_contacts' and column_name='phone'
  ) then
    alter table public.employee_emergency_contacts
      add column phone text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_emergency_contacts' and column_name='email'
  ) then
    alter table public.employee_emergency_contacts
      add column email text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_emergency_contacts' and column_name='created_at'
  ) then
    alter table public.employee_emergency_contacts
      add column created_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_emergency_contacts' and column_name='updated_at'
  ) then
    alter table public.employee_emergency_contacts
      add column updated_at timestamptz not null default now();
  end if;
end
$$;

-- 3) Enforce NOT NULLs now that columns exist
do $$
begin
  -- company_id to NOT NULL if no nulls remain
  perform 1 from public.employee_emergency_contacts where company_id is null limit 1;
  if not found then
    alter table public.employee_emergency_contacts
      alter column company_id set not null;
  end if;

  -- contact_name should be NOT NULL when present
  perform 1 from public.employee_emergency_contacts where contact_name is null limit 1;
  if not found then
    alter table public.employee_emergency_contacts
      alter column contact_name set not null;
  end if;
end
$$;

-- 4) Add UNIQUE(employee_id) if missing (for upsert target)
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'employee_emergency_contacts'
      and c.contype = 'u'
      and c.conname = 'employee_emergency_contacts_employee_id_key'
  ) then
    alter table public.employee_emergency_contacts
      add constraint employee_emergency_contacts_employee_id_key unique (employee_id);
  end if;
end
$$;

-- 5) Helpful indexes
create index if not exists idx_eec_employee on public.employee_emergency_contacts(employee_id);
create index if not exists idx_eec_company  on public.employee_emergency_contacts(company_id);

-- 6) updated_at trigger (helper function + trigger)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_eec_updated_at on public.employee_emergency_contacts;
create trigger trg_eec_updated_at
before update on public.employee_emergency_contacts
for each row execute function public.set_updated_at();

-- 7) RLS policies (idempotent)
create or replace function public.claim_company_id()
returns text
language sql
stable
as $$
  select current_setting('request.jwt.claims.company_id', true)
$$;

alter table if exists public.employee_emergency_contacts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='employee_emergency_contacts'
      and policyname='emergency_company_select'
  ) then
    execute $DDL$
      create policy emergency_company_select
      on public.employee_emergency_contacts
      for select
      using (company_id::text = public.claim_company_id());
    $DDL$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='employee_emergency_contacts'
      and policyname='emergency_company_modify'
  ) then
    execute $DDL$
      create policy emergency_company_modify
      on public.employee_emergency_contacts
      for all
      using (company_id::text = public.claim_company_id())
      with check (company_id::text = public.claim_company_id());
    $DDL$;
  end if;
end
$$;
