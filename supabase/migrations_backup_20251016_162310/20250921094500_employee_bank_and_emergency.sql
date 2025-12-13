-- Create helper function for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Employee bank accounts (unique by employee_id for upsert)
create table if not exists public.employee_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  company_id uuid not null,
  account_name text not null,
  -- store digits only; client can format with hyphens
  sort_code text not null check (sort_code ~ '^[0-9]{6}$'),
  account_number text not null check (account_number ~ '^[0-9]{6,8}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id)
);

create index if not exists idx_eba_employee on public.employee_bank_accounts(employee_id);
create index if not exists idx_eba_company on public.employee_bank_accounts(company_id);

drop trigger if exists trg_eba_updated_at on public.employee_bank_accounts;
create trigger trg_eba_updated_at
before update on public.employee_bank_accounts
for each row execute function public.set_updated_at();

-- (Optional, for next wizard step) Employee emergency contacts (unique by employee_id)
create table if not exists public.employee_emergency_contacts (
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

create index if not exists idx_eec_employee on public.employee_emergency_contacts(employee_id);
create index if not exists idx_eec_company on public.employee_emergency_contacts(company_id);

drop trigger if exists trg_eec_updated_at on public.employee_emergency_contacts;
create trigger trg_eec_updated_at
before update on public.employee_emergency_contacts
for each row execute function public.set_updated_at();
