-- 20250930094000_company_settings_autofill.sql
-- Auto-fill created_by with the logged-in user

create or replace function public.set_company_created_by()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_company_settings_created_by on public.company_settings;

create trigger trg_company_settings_created_by
before insert on public.company_settings
for each row
execute procedure public.set_company_created_by();
