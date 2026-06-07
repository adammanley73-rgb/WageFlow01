create or replace function public.guard_last_owner()
returns trigger
language plpgsql
set search_path to 'pg_catalog, public, extensions, auth, wf_util'
as $function$
declare
  owners_left integer;
  target_company_id uuid;
  target_user_id uuid;
begin
  if TG_OP = 'DELETE' then
    target_company_id := OLD.company_id;
    target_user_id := OLD.user_id;

    if OLD.role = 'owner' then
      select count(*)
      into owners_left
      from public.company_memberships
      where company_id = target_company_id
        and role = 'owner'
        and user_id is distinct from target_user_id;

      if owners_left < 1 then
        raise exception 'Cannot remove or demote the last owner of this company';
      end if;
    end if;

    return OLD;
  end if;

  if TG_OP = 'UPDATE' then
    target_company_id := OLD.company_id;
    target_user_id := OLD.user_id;

    if OLD.role = 'owner'
       and (
         NEW.role is distinct from 'owner'
         or NEW.company_id is distinct from OLD.company_id
         or NEW.user_id is distinct from OLD.user_id
       )
    then
      select count(*)
      into owners_left
      from public.company_memberships
      where company_id = target_company_id
        and role = 'owner'
        and user_id is distinct from target_user_id;

      if owners_left < 1 then
        raise exception 'Cannot remove or demote the last owner of this company';
      end if;
    end if;

    return NEW;
  end if;

  return NEW;
end;
$function$;
