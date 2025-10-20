-- supabase/migrations/20250930113000_my_companies_views.sql
-- normalized members view + "my companies" view

do $$
declare
  v_member_col text;
begin
  -- detect the member id column on company_members
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
    raise exception 'company_members missing member id column (expected one of profile_id, user_id, member_id)';
  end if;

  -- normalized members view
  execute format($v$
    create or replace view public.company_members_norm as
    select
      %1$I::uuid as member_user_id,
      company_id,
      role,
      created_at
    from public.company_members
  $v$, v_member_col);

  -- my companies view for the current user
  create or replace view public.my_companies_v as
  select c.id, c.name, c.created_at, m.role
  from public.companies c
  join public.company_members_norm m
    on m.company_id = c.id
  where m.member_user_id = auth.uid();
end
$$;
