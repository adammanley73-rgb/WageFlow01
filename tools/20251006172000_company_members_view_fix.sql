-- 20251006172000_company_members_view_fix.sql
-- Replace the company_members view to expose added_by and added_at so inserts/updates can target them.

create or replace view public.company_members as
select
  company_id,
  user_id,
  role,
  created_at,
  added_by,
  added_at
from public.company_memberships;
