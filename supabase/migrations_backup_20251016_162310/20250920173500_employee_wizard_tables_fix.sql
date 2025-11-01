-- 20250920173500_employee_wizard_tables_fix.sql
-- Clean DDL: explicit uuid types, safe uniqueness on employees(id),
-- partial unique indexes for single primary entries.

-- Touch helper
create or replace function public.fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- Ensure employees.id is unique (FK target must be unique or PK)
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'employees'
      and c.contype in ('p','u')
      and exists (
        select 1
        from unnest(c.conkey) col(attnum)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = col.attnum
        where a.attname = 'id'
      )
  ) then
    alter table public.employees
      add constraint uq_employees_id unique (id);
  end if;
end $$;

----------------------------------------------------------------------
-- 1) Starter details (P45/P46 etc.)
----------------------------------------------------------------------
create table if not exists public.employee_starter_details (
  id                  uuid primary key default gen_random_uuid(),
  employee_id         uuid not null references public.employees(id) on delete cascade,
  company_id          uuid not null,
  starter_declaration text check (starter_declaration in ('A','B','C')),
  p45_present         boolean,
  p45_tax_code        text,
  p45_prev_pay        numeric(12,2),
  p45_prev_tax        numeric(12,2),
  student_loan_plan   text check (student_loan_plan in ('none','plan1','plan2','plan4','plan5','pgl')) default 'none',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_esd_employee on public.employee_starter_details(employee_id);
create index if not exists idx_esd_company  on public.employee_starter_details(company_id);

drop trigger if exists trg_esd_touch on public.employee_starter_details;
create trigger trg_esd_touch
before update on public.employee_starter_details
for each row execute function public.fn_touch_updated_at();

-- One starter row per employee
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.employee_starter_details'::regclass
      and conname = 'uq_esd_employee_unique'
  ) then
    alter table public.employee_starter_details
      add constraint uq_esd_employee_unique unique (employee_id);
  end if;
end $$;

----------------------------------------------------------------------
-- 2) Bank accounts
----------------------------------------------------------------------
create table if not exists public.employee_bank_accounts (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid not null references public.employees(id) on delete cascade,
  company_id       uuid not null,
  account_name     text,
  sort_code        text,   -- store digits only; UI formats
  account_number   text,
  roll_number      text,
  building_society boolean not null default false,
  is_primary       boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_eba_employee on public.employee_bank_accounts(employee_id);
create index if not exists idx_eba_company  on public.employee_bank_accounts(company_id);

-- Normalise sort code and account number
create or replace function public.fn_eba_normalize()
returns trigger
language plpgsql
as $$
begin
  if new.sort_code is not null then
    new.sort_code := regexp_replace(new.sort_code, '\D', '', 'g');
  end if;
  if new.account_number is not null then
    new.account_number := regexp_replace(new.account_number, '\D', '', 'g');
  end if;
  return new;
end
$$;

drop trigger if exists trg_eba_normalize on public.employee_bank_accounts;
create trigger trg_eba_normalize
before insert or update on public.employee_bank_accounts
for each row execute function public.fn_eba_normalize();

drop trigger if exists trg_eba_touch on public.employee_bank_accounts;
create trigger trg_eba_touch
before update on public.employee_bank_accounts
for each row execute function public.fn_touch_updated_at();

-- Only one PRIMARY account per employee
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'uq_eba_primary_per_employee'
  ) then
    create unique index uq_eba_primary_per_employee
      on public.employee_bank_accounts(employee_id)
      where is_primary is true;
  end if;
end $$;

----------------------------------------------------------------------
-- 3) Emergency contacts
----------------------------------------------------------------------
create table if not exists public.employee_emergency_contacts (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  company_id    uuid not null,
  full_name     text,
  relationship  text,
  phone         text,
  alt_phone     text,
  email         text,
  address_line1 text,
  address_line2 text,
  city          text,
  postcode      text,
  is_primary    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_eec_employee on public.employee_emergency_contacts(employee_id);
create index if not exists idx_eec_company  on public.employee_emergency_contacts(company_id);

drop trigger if exists trg_eec_touch on public.employee_emergency_contacts;
create trigger trg_eec_touch
before update on public.employee_emergency_contacts
for each row execute function public.fn_touch_updated_at();

-- Only one PRIMARY emergency contact per employee
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'uq_eec_primary_per_employee'
  ) then
    create unique index uq_eec_primary_per_employee
      on public.employee_emergency_contacts(employee_id)
      where is_primary is true;
  end if;
end $$;
