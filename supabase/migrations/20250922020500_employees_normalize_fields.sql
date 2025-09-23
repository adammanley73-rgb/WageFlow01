-- Normalize certain employee fields on insert/update
create or replace function public.fn_employees_normalize_fields()
returns trigger
language plpgsql
as $$
begin
  -- NI number uppercase, strip spaces
  if new.ni_number is not null then
    new.ni_number := upper(replace(new.ni_number, ' ', ''));
  end if;

  -- pay_type to lowercase enum-like values (salary|hourly)
  if new.pay_type is not null then
    new.pay_type := case lower(new.pay_type)
      when 'hourly' then 'hourly'
      else 'salary'
    end;
  end if;

  -- frequency to allowed set
  if new.frequency is not null then
    new.frequency := case replace(lower(new.frequency), '-', '')
      when 'weekly' then 'weekly'
      when 'fortnightly' then 'fortnightly'
      when 'fourweekly'  then 'four_weekly'
      when '4weekly'     then 'four_weekly'
      else 'monthly'
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_employees_normalize_fields on public.employees;
create trigger trg_employees_normalize_fields
before insert or update on public.employees
for each row execute function public.fn_employees_normalize_fields();
