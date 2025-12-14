-- add_suggest_pay_date_function.sql
-- Purpose:
-- - Given a company, frequency and period, return a suggested pay_date
-- - Uses company_pay_schedules.pay_date_mode + pay_date_param_int
-- - Fallback is period_end if no schedule is found or mode is unknown

create or replace function public.suggest_pay_date(
  _company_id uuid,
  _frequency text,
  _period_start date,
  _period_end date
) returns date
language plpgsql
stable
as $$
declare
  cfg public.company_pay_schedules%rowtype;
  d date;
  param integer;
  year_int integer;
  month_int integer;
  last_of_month date;
begin
  -- Try to load the schedule for this company and frequency
  select *
  into cfg
  from public.company_pay_schedules
  where company_id = _company_id
    and frequency = _frequency;

  -- If no schedule exists, default to period_end
  if not found then
    return _period_end;
  end if;

  param := cfg.pay_date_param_int;
  year_int := extract(year from _period_end)::int;
  month_int := extract(month from _period_end)::int;
  last_of_month := (date_trunc('month', _period_end)::date + interval '1 month - 1 day')::date;

  if cfg.pay_date_mode = 'fixed_calendar_day' then
    -- Clamp requested day between 1 and 31
    if param is null then
      return _period_end;
    end if;

    d := make_date(year_int, month_int, greatest(1, least(param, 31)));

    -- If that overflowed into next month (for example 31st in Feb),
    -- use the actual last day of this month instead
    if extract(month from d) <> month_int then
      d := last_of_month;
    end if;

    return d;

  elsif cfg.pay_date_mode = 'last_working_day' then
    -- Start from last day of the month and walk backwards off weekends
    d := last_of_month;
    while extract(dow from d) in (0, 6) loop
      d := d - interval '1 day';
    end loop;
    return d;

  elsif cfg.pay_date_mode = 'last_friday' then
    -- Start from last of month and walk backwards until Friday (5)
    d := last_of_month;
    while extract(dow from d) <> 5 loop
      d := d - interval '1 day';
    end loop;
    return d;

  elsif cfg.pay_date_mode = 'offset_from_period_start' then
    -- Offset from the period_start in days
    return _period_start + coalesce(param, 0);

  elsif cfg.pay_date_mode = 'offset_from_period_end' then
    -- Offset from the period_end in days
    return _period_end + coalesce(param, 0);

  else
    -- Unknown mode, be conservative
    return _period_end;
  end if;
end;
$$;
