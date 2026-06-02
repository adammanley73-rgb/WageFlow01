alter table public.payroll_run_employees
add column if not exists recovery_applied_amount numeric(12,2) not null default 0,
add column if not exists recovery_balance_after_amount numeric(12,2),
add column if not exists recovery_application_status text not null default 'none',
add column if not exists recovery_application_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payroll_run_employees_recovery_application_status_check'
  ) then
    alter table public.payroll_run_employees
    add constraint payroll_run_employees_recovery_application_status_check
    check (recovery_application_status in ('none', 'proposed', 'applied', 'voided'));
  end if;
end;
$$;

create table if not exists public.payroll_recovery_applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  employee_id uuid not null,
  recovery_balance_id uuid not null references public.payroll_recovery_balances(id) on delete restrict,
  payroll_run_id uuid not null,
  payroll_run_employee_id uuid not null,
  amount_applied numeric(12,2) not null,
  balance_before numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  status text not null default 'proposed',
  note text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  voided_at timestamptz,
  created_by uuid,
  applied_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  constraint payroll_recovery_applications_amount_check check (
    amount_applied > 0
    and balance_before >= 0
    and balance_after >= 0
  ),
  constraint payroll_recovery_applications_status_check check (
    status in ('proposed', 'applied', 'voided')
  )
);

create unique index if not exists payroll_recovery_applications_run_employee_balance_unique
on public.payroll_recovery_applications (payroll_run_employee_id, recovery_balance_id);

create index if not exists payroll_recovery_applications_company_run_status_idx
on public.payroll_recovery_applications (company_id, payroll_run_id, status);

create index if not exists payroll_recovery_applications_balance_status_idx
on public.payroll_recovery_applications (recovery_balance_id, status);

alter table public.payroll_recovery_applications enable row level security;

drop policy if exists payroll_recovery_applications_select_company_member
on public.payroll_recovery_applications;

create policy payroll_recovery_applications_select_company_member
on public.payroll_recovery_applications
for select
to authenticated
using (public.is_payroll_recovery_company_member(company_id));

drop policy if exists payroll_recovery_applications_insert_company_member
on public.payroll_recovery_applications;

create policy payroll_recovery_applications_insert_company_member
on public.payroll_recovery_applications
for insert
to authenticated
with check (public.is_payroll_recovery_company_member(company_id));

drop policy if exists payroll_recovery_applications_update_company_member
on public.payroll_recovery_applications;

create policy payroll_recovery_applications_update_company_member
on public.payroll_recovery_applications
for update
to authenticated
using (public.is_payroll_recovery_company_member(company_id))
with check (public.is_payroll_recovery_company_member(company_id));

drop policy if exists payroll_recovery_applications_delete_proposed_company_member
on public.payroll_recovery_applications;

create policy payroll_recovery_applications_delete_proposed_company_member
on public.payroll_recovery_applications
for delete
to authenticated
using (
  public.is_payroll_recovery_company_member(company_id)
  and status = 'proposed'
);

create or replace function public.finalise_payroll_recovery_applications(
  p_company_id uuid,
  p_payroll_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_uid uuid := auth.uid();
  v_run_status text;
  v_application record;
  v_balance public.payroll_recovery_balances%rowtype;
  v_current_recovered numeric(12,2);
  v_current_outstanding numeric(12,2);
  v_next_recovered numeric(12,2);
  v_next_outstanding numeric(12,2);
  v_apply_amount numeric(12,2);
  v_next_status text;
  v_applied_count integer := 0;
  v_voided_count integer := 0;
  v_total_applied numeric(12,2) := 0;
begin
  if v_auth_uid is null then
    raise exception 'Unauthenticated payroll recovery finalisation.'
      using errcode = '28000';
  end if;

  if p_company_id is null or p_payroll_run_id is null then
    raise exception 'Company and payroll run are required.'
      using errcode = '22023';
  end if;

  if not public.is_payroll_recovery_company_member(p_company_id) then
    raise exception 'You do not have access to this company payroll recovery data.'
      using errcode = '42501';
  end if;

  select lower(trim(coalesce(status, '')))
  into v_run_status
  from public.payroll_runs
  where id = p_payroll_run_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Payroll run not found.'
      using errcode = 'P0002';
  end if;

  if v_run_status not in ('processing', 'approved') then
    raise exception 'Payroll recovery can only be finalised for a processing or approved payroll run.'
      using errcode = '22023';
  end if;

  update public.payroll_run_employees
  set
    recovery_applied_amount = 0,
    recovery_balance_after_amount = null,
    recovery_application_status = 'none',
    recovery_application_note = null
  where run_id = p_payroll_run_id;

  for v_application in
    select *
    from public.payroll_recovery_applications
    where company_id = p_company_id
      and payroll_run_id = p_payroll_run_id
      and status = 'proposed'
    order by created_at, id
    for update
  loop
    select *
    into v_balance
    from public.payroll_recovery_balances
    where id = v_application.recovery_balance_id
      and company_id = p_company_id
      and employee_id = v_application.employee_id
    for update;

    if not found then
      update public.payroll_recovery_applications
      set
        status = 'voided',
        voided_at = now(),
        applied_by = v_auth_uid,
        note = coalesce(note, 'Recovery application voided because the balance no longer exists.'),
        metadata = metadata || jsonb_build_object(
          'void_reason', 'balance_not_found',
          'voided_during_payroll_run_id', p_payroll_run_id
        )
      where id = v_application.id;

      v_voided_count := v_voided_count + 1;
      continue;
    end if;

    v_current_recovered := round(coalesce(v_balance.amount_recovered, 0)::numeric, 2);
    v_current_outstanding := round(coalesce(v_balance.amount_outstanding, 0)::numeric, 2);

    if lower(trim(coalesce(v_balance.status, 'open'))) in ('recovered', 'written_off', 'disputed') or v_current_outstanding <= 0 then
      update public.payroll_recovery_applications
      set
        status = 'voided',
        balance_before = greatest(v_current_outstanding, 0),
        balance_after = greatest(v_current_outstanding, 0),
        voided_at = now(),
        applied_by = v_auth_uid,
        note = coalesce(note, 'Recovery application voided because the balance is not available for payroll recovery.'),
        metadata = metadata || jsonb_build_object(
          'void_reason', 'balance_unavailable',
          'balance_status', v_balance.status,
          'amount_outstanding', v_current_outstanding,
          'voided_during_payroll_run_id', p_payroll_run_id
        )
      where id = v_application.id;

      v_voided_count := v_voided_count + 1;
      continue;
    end if;

    v_apply_amount := round(least(v_application.amount_applied, v_current_outstanding), 2);

    if v_apply_amount <= 0 then
      update public.payroll_recovery_applications
      set
        status = 'voided',
        balance_before = greatest(v_current_outstanding, 0),
        balance_after = greatest(v_current_outstanding, 0),
        voided_at = now(),
        applied_by = v_auth_uid,
        note = coalesce(note, 'Recovery application voided because there is no amount left to recover.'),
        metadata = metadata || jsonb_build_object(
          'void_reason', 'nothing_to_apply',
          'voided_during_payroll_run_id', p_payroll_run_id
        )
      where id = v_application.id;

      v_voided_count := v_voided_count + 1;
      continue;
    end if;

    v_next_recovered := round(v_current_recovered + v_apply_amount, 2);
    v_next_outstanding := round(v_current_outstanding - v_apply_amount, 2);

    if v_next_outstanding <= 0 then
      v_next_status := 'recovered';
    elsif v_next_recovered > 0 then
      v_next_status := 'part_recovered';
    else
      v_next_status := 'open';
    end if;

    update public.payroll_recovery_balances
    set
      amount_recovered = v_next_recovered,
      amount_outstanding = v_next_outstanding,
      status = v_next_status,
      updated_by = v_auth_uid
    where id = v_balance.id;

    update public.payroll_recovery_applications
    set
      amount_applied = v_apply_amount,
      balance_before = v_current_outstanding,
      balance_after = v_next_outstanding,
      status = 'applied',
      applied_at = now(),
      applied_by = v_auth_uid,
      note = coalesce(note, 'Recovery from previous overpayment applied through payroll.'),
      metadata = metadata || jsonb_build_object(
        'finalised_during_payroll_run_id', p_payroll_run_id,
        'previous_amount_recovered', v_current_recovered,
        'next_amount_recovered', v_next_recovered,
        'previous_amount_outstanding', v_current_outstanding,
        'next_amount_outstanding', v_next_outstanding,
        'previous_status', v_balance.status,
        'next_status', v_next_status
      )
    where id = v_application.id;

    insert into public.payroll_recovery_transactions (
      company_id,
      employee_id,
      recovery_balance_id,
      payroll_run_id,
      payroll_run_employee_id,
      transaction_type,
      amount,
      balance_after,
      description,
      created_by,
      metadata
    )
    values (
      v_balance.company_id,
      v_balance.employee_id,
      v_balance.id,
      p_payroll_run_id,
      v_application.payroll_run_employee_id,
      'payroll_recovery_applied',
      v_apply_amount,
      v_next_outstanding,
      coalesce(v_application.note, 'Recovery from previous overpayment applied through payroll.'),
      v_auth_uid,
      jsonb_build_object(
        'application_id', v_application.id,
        'source_payroll_run_id', v_balance.source_payroll_run_id,
        'source_payroll_run_employee_id', v_balance.source_payroll_run_employee_id,
        'previous_amount_recovered', v_current_recovered,
        'next_amount_recovered', v_next_recovered,
        'previous_amount_outstanding', v_current_outstanding,
        'next_amount_outstanding', v_next_outstanding,
        'previous_status', v_balance.status,
        'next_status', v_next_status
      )
    );

    v_applied_count := v_applied_count + 1;
    v_total_applied := round(v_total_applied + v_apply_amount, 2);
  end loop;

  update public.payroll_run_employees pre
  set
    recovery_applied_amount = summary.amount_applied,
    recovery_balance_after_amount = summary.balance_after,
    recovery_application_status = case
      when summary.amount_applied > 0 then 'applied'
      else 'none'
    end,
    recovery_application_note = case
      when summary.amount_applied > 0 then 'Recovery from previous overpayment applied through payroll.'
      else null
    end
  from (
    select
      payroll_run_employee_id,
      round(sum(amount_applied), 2) as amount_applied,
      round(sum(balance_after), 2) as balance_after
    from public.payroll_recovery_applications
    where company_id = p_company_id
      and payroll_run_id = p_payroll_run_id
      and status = 'applied'
    group by payroll_run_employee_id
  ) summary
  where pre.id = summary.payroll_run_employee_id
    and pre.run_id = p_payroll_run_id;

  update public.payroll_run_employees
  set
    recovery_application_status = 'voided',
    recovery_application_note = 'Proposed payroll recovery was not applied because the balance was unavailable.'
  where id in (
    select distinct payroll_run_employee_id
    from public.payroll_recovery_applications
    where company_id = p_company_id
      and payroll_run_id = p_payroll_run_id
      and status = 'voided'
  )
  and run_id = p_payroll_run_id
  and recovery_applied_amount = 0;

  return jsonb_build_object(
    'ok', true,
    'payroll_run_id', p_payroll_run_id,
    'applied_count', v_applied_count,
    'voided_count', v_voided_count,
    'total_applied', v_total_applied
  );
end;
$$;

grant execute on function public.finalise_payroll_recovery_applications(uuid, uuid) to authenticated;
