alter table if exists public.employee_bank
add column if not exists payment_method text;

alter table if exists public.employee_bank_accounts
add column if not exists payment_method text;

update public.employee_bank_accounts
set payment_method = case
  when nullif(trim(coalesce(account_name, '')), '') is not null
    or nullif(trim(coalesce(sort_code, '')), '') is not null
    or nullif(trim(coalesce(account_number, '')), '') is not null
    then 'bacs'
  else 'not_confirmed'
end
where payment_method is null
   or payment_method not in (
    'bacs',
    'manual_transfer',
    'cash',
    'cheque',
    'not_confirmed'
  );

alter table if exists public.employee_bank
alter column payment_method set default 'not_confirmed';

alter table if exists public.employee_bank_accounts
alter column payment_method set default 'not_confirmed';

alter table if exists public.employee_bank
drop constraint if exists employee_bank_payment_method_check;

alter table if exists public.employee_bank_accounts
drop constraint if exists employee_bank_accounts_payment_method_check;

alter table if exists public.employee_bank
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

alter table if exists public.employee_bank_accounts
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
