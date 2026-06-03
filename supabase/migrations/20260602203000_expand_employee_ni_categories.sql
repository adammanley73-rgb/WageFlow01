do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint c
    join pg_class t
      on t.oid = c.conrelid
    join pg_namespace n
      on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'employees'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%ni_category%'
  loop
    execute format(
      'alter table public.employees drop constraint if exists %I',
      v_constraint.conname
    );
  end loop;
end;
$$;

alter table public.employees
add constraint employees_ni_category_check
check (
  ni_category is null
  or upper(trim(ni_category)) in (
    'A',
    'B',
    'C',
    'H',
    'J',
    'M',
    'V',
    'Z',
    'F',
    'I',
    'L',
    'S',
    'N',
    'E',
    'D',
    'K'
  )
);
