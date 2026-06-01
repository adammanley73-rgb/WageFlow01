alter table public.payroll_run_employees
add column if not exists calculated_net_pay numeric(12,2),
add column if not exists payable_net_pay numeric(12,2),
add column if not exists recovery_created_amount numeric(12,2) not null default 0,
add column if not exists recovery_status text not null default 'none',
add column if not exists recovery_note text;

create table if not exists public.payroll_recovery_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  employee_id uuid not null,
  source_payroll_run_id uuid,
  source_payroll_run_employee_id uuid,
  reason_code text not null default 'negative_net_pay',
  description text,
  original_calculated_net_pay numeric(12,2) not null,
  original_payable_net_pay numeric(12,2) not null default 0,
  original_recovery_amount numeric(12,2) not null,
  amount_recovered numeric(12,2) not null default 0,
  amount_outstanding numeric(12,2) not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint payroll_recovery_balances_amounts_check check (
    original_recovery_amount >= 0
    and amount_recovered >= 0
    and amount_outstanding >= 0
  ),
  constraint payroll_recovery_balances_status_check check (
    status in ('open', 'part_recovered', 'recovered', 'written_off', 'disputed')
  ),
  constraint payroll_recovery_balances_reason_check check (
    reason_code in (
      'negative_net_pay',
      'overpayment_recovery',
      'deduction_refund',
      'paye_rebate',
      'leaver_recovery',
      'manual_adjustment',
      'other'
    )
  )
);

create table if not exists public.payroll_recovery_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  employee_id uuid not null,
  recovery_balance_id uuid not null references public.payroll_recovery_balances(id) on delete cascade,
  payroll_run_id uuid,
  payroll_run_employee_id uuid,
  transaction_type text not null,
  amount numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  constraint payroll_recovery_transactions_amount_check check (
    amount >= 0
    and balance_after >= 0
  ),
  constraint payroll_recovery_transactions_type_check check (
    transaction_type in (
      'created',
      'payroll_recovery_applied',
      'manual_repayment',
      'write_off',
      'dispute_opened',
      'dispute_resolved',
      'manual_adjustment'
    )
  )
);

create unique index if not exists payroll_recovery_balances_source_row_unique
on public.payroll_recovery_balances (source_payroll_run_employee_id)
where source_payroll_run_employee_id is not null;

create index if not exists payroll_recovery_balances_company_employee_status_idx
on public.payroll_recovery_balances (company_id, employee_id, status);

create index if not exists payroll_recovery_transactions_balance_created_idx
on public.payroll_recovery_transactions (recovery_balance_id, created_at);

create or replace function public.set_payroll_recovery_balance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_payroll_recovery_balance_updated_at
on public.payroll_recovery_balances;

create trigger set_payroll_recovery_balance_updated_at
before update on public.payroll_recovery_balances
for each row
execute function public.set_payroll_recovery_balance_updated_at();

alter table public.payroll_recovery_balances enable row level security;

alter table public.payroll_recovery_transactions enable row level security;
create or replace function public.is_payroll_recovery_company_member(p_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean := false;
begin
  if auth.uid() is null then
    return false;
  end if;

  if to_regclass('public.company_memberships') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'company_memberships'
        and column_name = 'user_id'
    ) then
      execute
        'select exists (
           select 1
           from public.company_memberships cm
           where cm.company_id = $1
             and cm.user_id = auth.uid()
         )'
      into v_exists
      using p_company_id;

      if v_exists then
        return true;
      end if;
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'company_memberships'
        and column_name = 'user_id_uuid'
    ) then
      execute
        'select exists (
           select 1
           from public.company_memberships cm
           where cm.company_id = $1
             and cm.user_id_uuid = auth.uid()
         )'
      into v_exists
      using p_company_id;

      if v_exists then
        return true;
      end if;
    end if;
  end if;

  if to_regclass('public.user_company_memberships') is not null then
    execute
      'select exists (
         select 1
         from public.user_company_memberships ucm
         where ucm.company_id = $1
           and ucm.user_id = auth.uid()
       )'
    into v_exists
    using p_company_id;

    if v_exists then
      return true;
    end if;
  end if;

  return false;
end;
$$;

grant execute on function public.is_payroll_recovery_company_member(uuid) to authenticated;

drop policy if exists payroll_recovery_balances_select_company_member
on public.payroll_recovery_balances;

create policy payroll_recovery_balances_select_company_member
on public.payroll_recovery_balances
for select
to authenticated
using (public.is_payroll_recovery_company_member(company_id));

drop policy if exists payroll_recovery_balances_insert_company_member
on public.payroll_recovery_balances;

create policy payroll_recovery_balances_insert_company_member
on public.payroll_recovery_balances
for insert
to authenticated
with check (public.is_payroll_recovery_company_member(company_id));

drop policy if exists payroll_recovery_balances_update_company_member
on public.payroll_recovery_balances;

create policy payroll_recovery_balances_update_company_member
on public.payroll_recovery_balances
for update
to authenticated
using (public.is_payroll_recovery_company_member(company_id))
with check (public.is_payroll_recovery_company_member(company_id));

drop policy if exists payroll_recovery_transactions_select_company_member
on public.payroll_recovery_transactions;

create policy payroll_recovery_transactions_select_company_member
on public.payroll_recovery_transactions
for select
to authenticated
using (public.is_payroll_recovery_company_member(company_id));

drop policy if exists payroll_recovery_transactions_insert_company_member
on public.payroll_recovery_transactions;

create policy payroll_recovery_transactions_insert_company_member
on public.payroll_recovery_transactions
for insert
to authenticated
with check (public.is_payroll_recovery_company_member(company_id));