begin;

create or replace function wf_util.enforce_run_company_match()
returns trigger
language plpgsql
as $function$
declare
  parent_company uuid;
begin
  if new.run_id is null then
    raise exception 'Line item run_id cannot be NULL';
  end if;

  select company_id
    into parent_company
  from payroll_runs
  where id = new.run_id;

  if not found then
    raise exception 'Run % not found', new.run_id;
  end if;

  if parent_company is null then
    raise exception 'Run % has no company_id', new.run_id;
  end if;

  -- If the caller forgot company_id, fix it safely.
  if new.company_id is null then
    new.company_id := parent_company;
    return new;
  end if;

  -- If they provided a value, it must match.
  if new.company_id is distinct from parent_company then
    raise exception 'Line item company_id % must match parent run company_id %', new.company_id, parent_company;
  end if;

  return new;
end
$function$;

commit;
