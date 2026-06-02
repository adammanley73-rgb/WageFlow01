create or replace function public.apply_payroll_recovery_action(
  p_company_id uuid,
  p_employee_id uuid,
  p_recovery_balance_id uuid,
  p_action text,
  p_amount numeric default null,
  p_description text default null,
  p_direction text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_uid uuid := auth.uid();
  v_balance public.payroll_recovery_balances%rowtype;
  v_current_recovered numeric(12,2);
  v_current_outstanding numeric(12,2);
  v_current_status text;
  v_amount numeric(12,2);
  v_description text;
  v_direction text;
  v_transaction_type text;
  v_transaction_amount numeric(12,2) := 0;
  v_next_recovered numeric(12,2);
  v_next_outstanding numeric(12,2);
  v_next_status text;
  v_transaction public.payroll_recovery_transactions%rowtype;
begin
  if v_auth_uid is null then
    raise exception 'Unauthenticated recovery action.'
      using errcode = '28000';
  end if;

  if p_company_id is null or p_employee_id is null or p_recovery_balance_id is null then
    raise exception 'Company, employee, and recovery balance are required.'
      using errcode = '22023';
  end if;

  if not public.is_payroll_recovery_company_member(p_company_id) then
    raise exception 'You do not have access to this company recovery balance.'
      using errcode = '42501';
  end if;

  select *
  into v_balance
  from public.payroll_recovery_balances
  where id = p_recovery_balance_id
    and company_id = p_company_id
    and employee_id = p_employee_id
  for update;

  if not found then
    raise exception 'Recovery balance not found for this employee.'
      using errcode = 'P0002';
  end if;

  v_current_recovered := round(coalesce(v_balance.amount_recovered, 0)::numeric, 2);
  v_current_outstanding := round(coalesce(v_balance.amount_outstanding, 0)::numeric, 2);
  v_current_status := lower(trim(coalesce(v_balance.status, 'open')));
  v_next_recovered := v_current_recovered;
  v_next_outstanding := v_current_outstanding;
  v_next_status := v_current_status;
  v_description := nullif(trim(coalesce(p_description, '')), '');
  v_direction := lower(trim(coalesce(p_direction, '')));
  v_amount := round(coalesce(p_amount, 0)::numeric, 2);

  if v_current_status in ('recovered', 'written_off') then
    raise exception 'This recovery balance is closed.'
      using errcode = '22023';
  end if;

  if p_action = 'record_repayment' then
    if v_amount <= 0 then
      raise exception 'Enter a repayment amount greater than 0.'
        using errcode = '22023';
    end if;

    if v_amount > v_current_outstanding then
      raise exception 'Repayment cannot be greater than the outstanding amount.'
        using errcode = '22023';
    end if;

    v_transaction_type := 'manual_repayment';
    v_transaction_amount := v_amount;
    v_next_recovered := round(v_current_recovered + v_amount, 2);
    v_next_outstanding := round(v_current_outstanding - v_amount, 2);

    if v_next_outstanding <= 0 then
      v_next_status := 'recovered';
    elsif v_next_recovered > 0 then
      v_next_status := 'part_recovered';
    else
      v_next_status := 'open';
    end if;

    v_description := coalesce(v_description, 'Manual repayment recorded.');

  elsif p_action = 'write_off' then
    if v_amount <= 0 then
      v_amount := v_current_outstanding;
    end if;

    if v_amount <= 0 then
      raise exception 'Enter a write-off amount greater than 0.'
        using errcode = '22023';
    end if;

    if v_amount > v_current_outstanding then
      raise exception 'Write-off cannot be greater than the outstanding amount.'
        using errcode = '22023';
    end if;

    if v_description is null then
      raise exception 'Enter a reason for writing off the balance.'
        using errcode = '22023';
    end if;

    v_transaction_type := 'write_off';
    v_transaction_amount := v_amount;
    v_next_outstanding := round(v_current_outstanding - v_amount, 2);

    if v_next_outstanding <= 0 then
      v_next_status := 'written_off';
    elsif v_next_recovered > 0 then
      v_next_status := 'part_recovered';
    else
      v_next_status := 'open';
    end if;

  elsif p_action = 'mark_disputed' then
    if v_description is null then
      raise exception 'Enter a reason for marking the balance as disputed.'
        using errcode = '22023';
    end if;

    v_transaction_type := 'dispute_opened';
    v_transaction_amount := 0;
    v_next_status := 'disputed';

  elsif p_action = 'resolve_dispute' then
    v_transaction_type := 'dispute_resolved';
    v_transaction_amount := 0;

    if v_current_outstanding <= 0 then
      v_next_status := 'recovered';
    elsif v_current_recovered > 0 then
      v_next_status := 'part_recovered';
    else
      v_next_status := 'open';
    end if;

    v_description := coalesce(v_description, 'Dispute resolved.');

  elsif p_action = 'manual_adjustment' then
    if v_amount <= 0 then
      raise exception 'Enter an adjustment amount greater than 0.'
        using errcode = '22023';
    end if;

    if v_direction not in ('increase', 'decrease') then
      raise exception 'Adjustment direction must be "increase" or "decrease".'
        using errcode = '22023';
    end if;

    if v_description is null then
      raise exception 'Enter a reason for the manual adjustment.'
        using errcode = '22023';
    end if;

    if v_direction = 'decrease' and v_amount > v_current_outstanding then
      raise exception 'Decrease adjustment cannot be greater than the outstanding amount.'
        using errcode = '22023';
    end if;

    v_transaction_type := 'manual_adjustment';
    v_transaction_amount := v_amount;

    if v_direction = 'increase' then
      v_next_outstanding := round(v_current_outstanding + v_amount, 2);
    else
      v_next_outstanding := round(v_current_outstanding - v_amount, 2);
    end if;

    if v_next_outstanding <= 0 then
      v_next_status := 'recovered';
    elsif v_next_recovered > 0 then
      v_next_status := 'part_recovered';
    else
      v_next_status := 'open';
    end if;

  else
    raise exception 'A valid recovery action is required.'
      using errcode = '22023';
  end if;

  update public.payroll_recovery_balances
  set
    amount_recovered = v_next_recovered,
    amount_outstanding = v_next_outstanding,
    status = v_next_status,
    updated_by = v_auth_uid
  where id = v_balance.id
  returning *
  into v_balance;

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
    v_balance.source_payroll_run_id,
    v_balance.source_payroll_run_employee_id,
    v_transaction_type,
    v_transaction_amount,
    v_next_outstanding,
    v_description,
    v_auth_uid,
    jsonb_build_object(
      'action', p_action,
      'adjustment_direction', nullif(v_direction, ''),
      'previous_status', v_current_status,
      'next_status', v_next_status,
      'previous_amount_recovered', v_current_recovered,
      'next_amount_recovered', v_next_recovered,
      'previous_amount_outstanding', v_current_outstanding,
      'next_amount_outstanding', v_next_outstanding
    )
  )
  returning *
  into v_transaction;

  return jsonb_build_object(
    'ok', true,
    'action', p_action,
    'balance', to_jsonb(v_balance),
    'transaction', to_jsonb(v_transaction)
  );
end;
$$;

grant execute on function public.apply_payroll_recovery_action(uuid, uuid, uuid, text, numeric, text, text) to authenticated;