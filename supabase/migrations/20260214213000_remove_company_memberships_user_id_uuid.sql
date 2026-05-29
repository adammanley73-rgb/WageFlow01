/* E:\Projects\wageflow01\supabase\migrations\20260214213000_remove_company_memberships_user_id_uuid.sql */
/* Guarded because Supabase Preview may replay this migration before public.companies or public.company_memberships exists. */

do $$
begin
  if to_regclass('public.companies') is not null
     and to_regclass('public.company_memberships') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'company_memberships'
         and column_name = 'user_id'
     ) then

    drop view if exists public.vw_member_companies;

    execute '
      create view public.vw_member_companies as
      select distinct
        c.id,
        c.name,
        c.created_at,
        m.user_id
      from public.companies c
      join public.company_memberships m
        on m.company_id = c.id
      where m.user_id = auth.uid()
    ';
  end if;
end $$;

do $$
begin
  if to_regclass('public.companies') is not null
     and to_regclass('public.company_memberships') is not null
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
        and tablename = 'companies'
        and policyname = 'companies_read_if_member'
    ) then
      execute $pol$
        alter policy "companies_read_if_member"
        on public.companies
        using (
          exists (
            select 1
            from public.company_memberships m
            where m.company_id = companies.id
              and m.user_id = auth.uid()
          )
        )
      $pol$;
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.company_memberships') is not null then
    drop trigger if exists trg_fill_company_memberships_user_id_uuid on public.company_memberships;
    drop trigger if exists trg_company_memberships_sync_user_ids on public.company_memberships;

    drop policy if exists "company_memberships_select_own" on public.company_memberships;
    drop policy if exists "company_memberships_insert_own" on public.company_memberships;
    drop policy if exists "company_memberships_read_own" on public.company_memberships;
  end if;
end $$;

drop function if exists public.trg_fill_company_memberships_user_id_uuid();
drop function if exists public.trg_sync_membership_user_ids();

drop index if exists public.idx_company_memberships_user_id_uuid;

do $$
begin
  if to_regclass('public.company_memberships') is not null then
    alter table public.company_memberships drop column if exists user_id_uuid;
  end if;
end $$;

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

    create policy "company_memberships_select_own"
    on public.company_memberships
    for select
    to authenticated
    using (user_id = auth.uid());

    create policy "company_memberships_insert_own"
    on public.company_memberships
    for insert
    to authenticated
    with check (user_id = auth.uid());
  end if;
end $$;

create or replace function public.add_membership_by_name(p_company_name text, p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_company uuid;
begin
  if to_regclass('public.companies') is null
     or to_regclass('public.company_memberships') is null then
    raise exception 'Required company tables do not exist';
  end if;

  select id into v_company
  from public.companies
  where name = p_company_name;

  if v_company is null then
    raise exception 'Company % not found', p_company_name;
  end if;

  insert into public.company_memberships (company_id, user_id, role)
  select v_company, p_user, p_role
  where not exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = v_company
      and cm.user_id = p_user
  );
end
$function$;

create or replace function public.create_company_with_owner(p_company_id uuid, p_company_name text, p_owner_user_id uuid)
returns table(company_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_now timestamptz := now();
begin
  if to_regclass('public.companies') is null
     or to_regclass('public.company_memberships') is null then
    raise exception 'Required company tables do not exist';
  end if;

  if p_company_name is null or length(trim(p_company_name)) = 0 then
    raise exception 'Company name required';
  end if;

  if p_company_id is null then
    p_company_id := gen_random_uuid();
  end if;

  insert into public.companies (id, name, created_at, updated_at)
  values (p_company_id, trim(p_company_name), v_now, v_now)
  on conflict (id) do update set
    name = excluded.name,
    updated_at = v_now;

  insert into public.company_memberships (company_id, user_id, role, created_at, updated_at)
  values (p_company_id, p_owner_user_id, 'owner', v_now, v_now)
  on conflict (company_id, user_id) do update set
    role = excluded.role,
    updated_at = v_now;

  return query select p_company_id::uuid;
end;
$function$;

create or replace function public.is_member_of(p_company uuid)
returns boolean
language plpgsql
stable
set search_path to 'pg_catalog, public, extensions, auth, wf_util'
as $function$
begin
  if to_regclass('public.company_memberships') is null then
    return false;
  end if;

  return exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = p_company
      and cm.user_id = auth.uid()
  );
end;
$function$;

create or replace function public.is_owner_of(p_company uuid)
returns boolean
language plpgsql
stable
set search_path to 'pg_catalog, public, extensions, auth, wf_util'
as $function$
begin
  if to_regclass('public.company_memberships') is null then
    return false;
  end if;

  return exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = p_company
      and cm.role = 'owner'
      and cm.user_id = auth.uid()
  );
end;
$function$;