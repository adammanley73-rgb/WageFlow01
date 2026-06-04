alter table public.employee_bank
add column if not exists payment_method text;

alter table public.employee_bank_accounts
add column if not exists payment_method text;

update public.employee_bank
set payment_method = case
  when nullif(trim(coalesce(account_name, '')), '') is not null
    or nullif(trim(coalesce(sort_code, '')), '') is not null
    or nullif(trim(coalesce(account_number, '')), '') is not null
    then 'bacs'
  else 'not_confirmed'
end
where payment_method is null;

update public.employee_bank_accounts
set payment_method = case
  when nullif(trim(coalesce(account_name, '')), '') is not null
    or nullif(trim(coalesce(sort_code, '')), '') is not null
    or nullif(trim(coalesce(account_number, '')), '') is not null
    then 'bacs'
  else 'not_confirmed'
end
where payment_method is null;

alter table public.employee_bank
alter column payment_method set default 'not_confirmed';

alter table public.employee_bank_accounts
alter column payment_method set default 'not_confirmed';

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint c
    join pg_class t
      on t.oid = c.conrelid
    join pg_namespace n
      on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'employee_bank'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%payment_method%'
  loop
    execute format('alter table public.employee_bank drop constraint if exists %I', v_constraint.conname);
  end loop;
end;
$$;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint c
    join pg_class t
      on t.oid = c.conrelid
    join pg_namespace n
      on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'employee_bank_accounts'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%payment_method%'
  loop
    execute format('alter table public.employee_bank_accounts drop constraint if exists %I', v_constraint.conname);
  end loop;
end;
$$;

alter table public.employee_bank
add constraint employee_bank_payment_method_check
check (
  payment_method is null
  or payment_method in (
    'bacs',
    'manual_transfer',
    'cash',
    'cheque',
    'not_confirmed'
  )
);

alter table public.employee_bank_accounts
add constraint employee_bank_accounts_payment_method_check
check (
  payment_method is null
  or payment_method in (
    'bacs',
    'manual_transfer',
    'cash',
    'cheque',
    'not_confirmed'
  )
);
