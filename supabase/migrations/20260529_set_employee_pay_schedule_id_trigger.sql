create or replace function public.set_employee_pay_schedule_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_frequency text;
  resolved_schedule_id uuid;
begin
  resolved_frequency := nullif(
    trim(
      coalesce(
        to_jsonb(new)->>'pay_frequency',
        to_jsonb(new)->>'frequency',
        ''
      )
    ),
    ''
  );

  if new.pay_schedule_id is not null then
    return new;
  end if;

  if resolved_frequency is null then
    raise exception 'pay_frequency is required because employees.pay_schedule_id cannot be resolved automatically';
  end if;

  resolved_frequency := lower(resolved_frequency);

  if resolved_frequency in ('4-weekly', '4 weekly', 'four weekly') then
    resolved_frequency := 'four_weekly';
  end if;

  select ps.id
    into resolved_schedule_id
  from public.pay_schedules ps
  where ps.company_id = new.company_id
    and ps.frequency = resolved_frequency
    and ps.is_active = true
    and ps.is_default = true
  order by ps.created_at desc
  limit 1;

  if resolved_schedule_id is null then
    select ps.id
      into resolved_schedule_id
    from public.pay_schedules ps
    where ps.company_id = new.company_id
      and ps.frequency = resolved_frequency
      and ps.is_active = true
    order by ps.created_at desc
    limit 1;
  end if;

  if resolved_schedule_id is null then
    raise exception 'No active pay schedule found for company % and frequency %', new.company_id, resolved_frequency;
  end if;

  new.pay_frequency := resolved_frequency;
  new.pay_schedule_id := resolved_schedule_id;

  return new;
end;
$$;

do $$
declare
  has_frequency boolean;
begin
  if to_regclass('public.employees') is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'company_id'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'pay_frequency'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'pay_schedule_id'
  ) then
    return;
  end if;

  if to_regclass('public.pay_schedules') is null then
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'frequency'
  )
  into has_frequency;

  drop trigger if exists trg_set_employee_pay_schedule_id on public.employees;

  if has_frequency then
    create trigger trg_set_employee_pay_schedule_id
    before insert or update of pay_frequency, frequency, pay_schedule_id, company_id
    on public.employees
    for each row
    execute function public.set_employee_pay_schedule_id();
  else
    create trigger trg_set_employee_pay_schedule_id
    before insert or update of pay_frequency, pay_schedule_id, company_id
    on public.employees
    for each row
    execute function public.set_employee_pay_schedule_id();
  end if;
end $$;