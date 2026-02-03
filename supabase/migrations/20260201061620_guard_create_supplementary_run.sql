-- Guard supplementary run creation so it only works when the parent run is completed.

CREATE OR REPLACE FUNCTION public.create_supplementary_run(
  p_parent_run_id uuid,
  p_pay_date_override date DEFAULT NULL::date,
  p_pay_date_override_reason text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
declare
  pr record;
  v_new_run_id uuid;
begin
  select
    r.id,
    r.company_id,
    r.frequency,
    r.pay_schedule_id,
    r.pay_period_start,
    r.pay_period_end,
    r.pay_date,
    r.run_name,
    r.status
  into pr
  from public.payroll_runs r
  where r.id = p_parent_run_id;

  if pr.id is null then
    raise exception 'parent run not found: %', p_parent_run_id;
  end if;

  if pr.status is distinct from 'completed' then
    raise exception 'parent run must be completed to create a supplementary run. parent_run_id=%, status=%',
      p_parent_run_id, pr.status;
  end if;

  if pr.pay_schedule_id is null then
    raise exception 'parent run is missing pay_schedule_id: %', p_parent_run_id;
  end if;

  insert into public.payroll_runs (
    company_id,
    run_name,
    frequency,
    pay_period_start,
    pay_period_end,
    pay_date,
    pay_schedule_id,
    run_kind,
    parent_run_id,
    create_request_id,
    pay_date_overridden,
    pay_date_override_reason
  )
  values (
    pr.company_id,
    'Supplementary for ' || pr.run_name,
    pr.frequency,
    pr.pay_period_start,
    pr.pay_period_end,
    coalesce(p_pay_date_override, pr.pay_date),
    pr.pay_schedule_id,
    'supplementary',
    pr.id,
    gen_random_uuid(),
    (p_pay_date_override is not null),
    p_pay_date_override_reason
  )
  returning id into v_new_run_id;

  return v_new_run_id;
end;
$function$;
