-- 2) supabase/migrations/20250930105500_backfill_company_id_simple_v2.sql
-- Dynamic everywhere we touch the member id column.

do $$
declare
  v_member_col text;
  v_company_id uuid;
  v_candidate_uid uuid;
  sql text;
begin
  -- detect member id column on public.company_members
  select c.column_name
    into v_member_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'company_members'
    and c.column_name in ('profile_id','user_id','member_id')
  order by case c.column_name
             when 'profile_id' then 1
             when 'user_id' then 2
             else 3
           end
  limit 1;

  if v_member_col is null then
    raise exception 'Could not detect member id column on public.company_members.';
  end if;

  -- pick a candidate user id from company_members via dynamic SQL
  sql := format('select %I from public.company_members limit 1', v_member_col);
  execute sql into v_candidate_uid;

  -- if none, try first auth.users id (if table exists)
  if v_candidate_uid is null and exists (
    select 1 from information_schema.tables
    where table_schema = 'auth' and table_name = 'users'
  ) then
    select u.id into v_candidate_uid
    from auth.users u
    order by u.created_at asc
    limit 1;
  end if;

  -- ensure a default company exists; reuse first if present
  select id into v_company_id
  from public.companies
  order by created_at asc
  limit 1;

  if v_company_id is null then
    insert into public.companies(name)
    values ('My Company')
    returning id into v_company_id;
  end if;

  -- ensure an owner membership exists if we have a candidate uid
  if v_candidate_uid is not null then
    sql := format($f$
      insert into public.company_members(company_id, %1$I, role)
      select $1, $2, 'owner'
      where not exists (
        select 1 from public.company_members
        where company_id = $1 and %1$I = $2
      )$f$, v_member_col);
    execute sql using v_company_id, v_candidate_uid;
  else
    raise notice 'No candidate user id found to assign as owner; created/used company %.', v_company_id;
  end if;

  -- backfill orphan rows to the chosen company
  update public.employees e
     set company_id = v_company_id
   where e.company_id is null;

  update public.pay_runs pr
     set company_id = v_company_id
   where pr.company_id is null;
end
$$;
