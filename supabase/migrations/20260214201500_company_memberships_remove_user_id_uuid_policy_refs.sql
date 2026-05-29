/* E:\Projects\wageflow01\supabase\migrations\20260214201500_company_memberships_remove_user_id_uuid_policy_refs.sql */
/* Guarded because Supabase Preview may replay this migration before public.company_memberships.user_id exists. */

do $$
begin
  if to_regclass('public.company_memberships') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'company_memberships'
         and column_name = 'user_id'
     ) then

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'company_memberships'
        and policyname = 'company_memberships_insert_own'
    ) then
      execute 'alter policy "company_memberships_insert_own" on public.company_memberships with check (user_id = auth.uid())';
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'company_memberships'
        and policyname = 'company_memberships_select_own'
    ) then
      execute 'alter policy "company_memberships_select_own" on public.company_memberships using (user_id = auth.uid())';
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'company_memberships'
        and policyname = 'company_memberships_read_own'
    ) then
      execute 'alter policy "company_memberships_read_own" on public.company_memberships using (user_id = auth.uid())';
    end if;
  end if;
end $$;