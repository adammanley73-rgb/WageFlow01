-- supabase/migrations/20250930125000_rls_pay_run_employees_prune.sql
do $$
begin
  -- enable RLS if not already
  perform 1 from pg_class t join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='public' and t.relname='pay_run_employees' and relrowsecurity;
  if not found then
    execute 'alter table public.pay_run_employees enable row level security';
  end if;

  -- drop legacy/duplicate policies if present
  if exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_company_modify') then
    drop policy pre_company_modify on public.pay_run_employees;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_del') then
    drop policy pre_del on public.pay_run_employees;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_ins') then
    drop policy pre_ins on public.pay_run_employees;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_sel') then
    drop policy pre_sel on public.pay_run_employees;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='pay_run_employees' and policyname='pre_upd') then
    drop policy pre_upd on public.pay_run_employees;
  end if;

  -- ensure the canonical four exist (idempotent)
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='pay_run_employees' and policyname='pre_select_members'
  ) then
    create policy pre_select_members on public.pay_run_employees
      for select using ( public.is_company_member(company_id) );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='pay_run_employees' and policyname='pre_insert_admins'
  ) then
    create policy pre_insert_admins on public.pay_run_employees
      for insert with check ( public.is_company_admin_or_owner(company_id) );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='pay_run_employees' and policyname='pre_update_admins'
  ) then
    create policy pre_update_admins on public.pay_run_employees
      for update using ( public.is_company_admin_or_owner(company_id) )
                 with check ( public.is_company_admin_or_owner(company_id) );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='pay_run_employees' and policyname='pre_delete_owners'
  ) then
    create policy pre_delete_owners on public.pay_run_employees
      for delete using ( public.is_company_owner(company_id) );
  end if;
end
$$;
