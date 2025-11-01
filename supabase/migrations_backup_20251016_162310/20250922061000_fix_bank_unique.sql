-- Fix: ensure employee_bank_accounts has a UNIQUE constraint on (employee_id)
-- and expected check constraints, even if the table already existed.

-- Add UNIQUE (employee_id) if missing
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'employee_bank_accounts'
      and c.conname = 'employee_bank_accounts_employee_id_key'
  ) then
    alter table public.employee_bank_accounts
      add constraint employee_bank_accounts_employee_id_key unique (employee_id);
  end if;
end
$$;

-- Add sort_code digits-only check if missing (6 digits)
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'employee_bank_accounts'
      and c.conname = 'employee_bank_accounts_sort_code_check'
  ) then
    alter table public.employee_bank_accounts
      add constraint employee_bank_accounts_sort_code_check
      check (sort_code ~ '^[0-9]{6}$');
  end if;
end
$$;

-- Add account_number length check if missing (6–8 digits)
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'employee_bank_accounts'
      and c.conname = 'employee_bank_accounts_account_number_check'
  ) then
    alter table public.employee_bank_accounts
      add constraint employee_bank_accounts_account_number_check
      check (account_number ~ '^[0-9]{6,8}$');
  end if;
end
$$;

-- Ensure updated_at trigger exists
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_eba_updated_at on public.employee_bank_accounts;
create trigger trg_eba_updated_at
before update on public.employee_bank_accounts
for each row execute function public.set_updated_at();
