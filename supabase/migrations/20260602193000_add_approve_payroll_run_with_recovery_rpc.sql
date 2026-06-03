create or replace function public.approve_payroll_run_with_recovery_applications(
  p_company_id uuid,
  p_payroll_run_id uuid,
  p_user_id uuid,
  p_comment text default 'Approved payroll run'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_uid uuid := auth.uid();
  v_run record;
  v_now timestamptz := now();
  v_current_status text;
  v_history jsonb;
  v_entry jsonb;
  v_recovery_result jsonb;
begin
  if v_auth_uid is null then
    raise exception 'Unauthenticated payroll approval.'
      using errcode = '28000';
  end if;

  if p_company_id is null or p_payroll_run_id is null then
    raise exception 'Company and payroll run are required.'
      using errcode = '22023';
  end if;

  if p_user_id is null then
    p_user_id := v_auth_uid;
  end if;

  if p_user_id <> v_auth_uid then
    raise exception 'Approval user does not match authenticated user.'
      using errcode = '42501';
  end if;

  if not public.is_payroll_recovery_company_member(p_company_id) then
    raise exception 'You do not have access to this company payroll run.'
      using errcode = '42501';
  end if;

  select *
  into v_run
  from public.payroll_runs
  where id = p_payroll_run_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Payroll run not found.'
      using errcode = 'P0002';
  end if;

  v_current_status := lower(trim(coalesce(v_run.status::text, 'draft')));

  if v_current_status <> 'processing' then
    raise exception 'Approve is only allowed from processing status.'
      using errcode = '22023';
  end if;

  v_recovery_result := public.finalise_payroll_recovery_applications(
    p_company_id,
    p_payroll_run_id
  );

  v_history := coalesce(to_jsonb(v_run.workflow_history), '[]'::jsonb);

  if jsonb_typeof(v_history) <> 'array' then
    v_history := '[]'::jsonb;
  end if;

  v_entry := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'from_status', v_current_status,
    'to_status', 'approved',
    'changed_by', p_user_id,
    'changed_at', v_now,
    'comment', coalesce(nullif(trim(p_comment), ''), 'Approved payroll run'),
    'automated', false
  );

  update public.payroll_runs
  set
    status = 'approved',
    workflow_status = 'approved',
    workflow_history = v_history || jsonb_build_array(v_entry),
    updated_at = v_now,
    processing_completed_at = coalesce(processing_completed_at, v_now),
    approved_by_user_id = p_user_id,
    approved_at = v_now
  where id = p_payroll_run_id
    and company_id = p_company_id
  returning *
  into v_run;

  return jsonb_build_object(
    'ok', true,
    'run', to_jsonb(v_run),
    'recovery', v_recovery_result
  );
end;
$$;

grant execute on function public.approve_payroll_run_with_recovery_applications(uuid, uuid, uuid, text) to authenticated;
