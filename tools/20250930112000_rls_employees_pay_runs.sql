-- supabase/migrations/20250930112000_rls_employees_pay_runs.sql
-- Creates a normalized members view, helper functions, enables RLS,
-- and adds idempotent policies for employees and pay_runs.

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

  -- create or replace normalized view with the detected column
  execute format($v$
    create or replace view public.company_members_norm as
    select
      %1$I::uuid as member_user_id,
      company_id,
      role
    from public.company_members
  $v$, v_member_col);

  -- helper: is current user a member of company_id?
  create or replace function public.is_company_member(p_company_id uuid)
  returns boolean
  language sql
  stable
  as $f$
    select exists (
      select 1
      from public.company_members_norm m
      where m.company_id = p_company_id
        and m.member_user_id = auth.uid()
    );
  $f$;

  -- helper: is current user admin or owner for company_id?
  create or replace function public.is_company_admin_or_owner(p_company_id uuid)
  returns boolean
  language sql
  stable
  as $f$
    select exists (
      select 1
      from public.company_members_norm m
      where m.company_id = p_company_id
        and m.member_user_id = auth.uid()
        and m.role in ('admin','owner')
    );
  $f$;

  -- helper: is current user owner for company_id?
  create or replace function public.is_company_owner(p_company_id uuid)
  returns boolean
  language sql
  stable
  as $f$
    select exists (
      select 1
      from public.company_members_norm m
      where m.company_id = p_company_id
        and m.member_user_id = auth.uid()
        and m.role = 'owner'
    );
  $f$;

  -- enable RLS (idempotent)
  if not exists (
    select 1 from pg_tables where schemaname='public' and tablename='employees'
  ) then
    raise exception 'public.employees not found';
  end if;

  if not exists (
    select 1 from pg_tables where schemaname='public' and tablename='pay_runs'
  ) then
    raise exception 'public.pay_runs not found';
  end if;

  perform 1 from pg_class t join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='public' and t.relname='employees' and relrowsecurity;
  if not found then
    execute 'alter table public.employees enable row level security';
  end if;

  perform 1 from pg_class t join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='public' and t.relname='pay_runs' and relrowsecurity;
  if not found then
    execute 'alter table public.pay_runs enable row level security';
  end if;

  -- employees policies
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='employees' and policyname='employees_select_members') then
    create policy employees_select_members on public.employees
      for select using ( public.is_company_member(company_id) );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='employees' and policyname='employees_insert_members') then
    create policy employees_insert_members on public.employees
      for insert with check ( public.is_company_member(company_id) );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='employees' and policyname='employees_update_members') then
    create policy employees_update_members on public.employees
      for update using ( public.is_company_member(company_id) )
                 with check ( public.is_company_member(company_id) );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='employees' and policyname='employees_delete_admins') then
    create policy employees_delete_admins on public.employees
      for delete using ( public.is_company_admin_or_owner(company_id) );
  end if;

  -- pay_runs policies
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_runs' and policyname='pay_runs_select_members') then
    create policy pay_runs_select_members on public.pay_runs
      for select using ( public.is_company_member(company_id) );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_runs' and policyname='pay_runs_insert_admins') then
    create policy pay_runs_insert_admins on public.pay_runs
      for insert with check ( public.is_company_admin_or_owner(company_id) );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_runs' and policyname='pay_runs_update_admins') then
    create policy pay_runs_update_admins on public.pay_runs
      for update using ( public.is_company_admin_or_owner(company_id) )
                 with check ( public.is_company_admin_or_owner(company_id) );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pay_runs' and policyname='pay_runs_delete_owners') then
    create policy pay_runs_delete_owners on public.pay_runs
      for delete using ( public.is_company_owner(company_id) );
  end if;
end
$$;
