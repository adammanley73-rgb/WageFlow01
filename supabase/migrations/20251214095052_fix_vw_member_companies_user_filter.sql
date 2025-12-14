-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251214095052_fix_vw_member_companies_user_filter.sql
-- Fix vw_member_companies so it returns only companies for the current authenticated user.
-- Prevents duplicate company rows (one per membership) in the UI.

create or replace view public.vw_member_companies as
select distinct
c.id,
c.name,
c.created_at,
m.user_id_uuid
from public.companies c
join public.company_memberships m on m.company_id = c.id
where m.user_id_uuid = auth.uid();