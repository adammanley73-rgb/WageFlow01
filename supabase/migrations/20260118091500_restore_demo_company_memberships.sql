-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20260118091500_restore_demo_company_memberships.sql
-- Purpose: Restore the minimal Companies + Memberships model required by:
-- - /dashboard/companies (Company Selection) -> queries public.vw_member_companies
-- - ActiveCompanyBanner -> queries public.companies(id,name)
-- Safe: uses IF EXISTS / IF NOT EXISTS and can run on other environments without breaking.

BEGIN;

-- 1) Ensure companies has the fields the app reads
ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS name text;

-- 2) Create the membership table the view expects
CREATE TABLE IF NOT EXISTS public.company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id_uuid uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_memberships_company_user_unique UNIQUE (company_id, user_id_uuid)
);

-- 3) RLS for memberships so authenticated users only see their own rows
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_memberships_select_own" ON public.company_memberships;
CREATE POLICY "company_memberships_select_own"
ON public.company_memberships
FOR SELECT
TO authenticated
USING (user_id_uuid = auth.uid());

DROP POLICY IF EXISTS "company_memberships_insert_own" ON public.company_memberships;
CREATE POLICY "company_memberships_insert_own"
ON public.company_memberships
FOR INSERT
TO authenticated
WITH CHECK (user_id_uuid = auth.uid());

-- 4) Create or replace the view used by Company Selection
DROP VIEW IF EXISTS public.vw_member_companies;

CREATE OR REPLACE VIEW public.vw_member_companies AS
SELECT DISTINCT
  c.id,
  c.name,
  c.created_at,
  m.user_id_uuid
FROM public.companies c
JOIN public.company_memberships m ON m.company_id = c.id
WHERE m.user_id_uuid = auth.uid();

-- 5) Grants so PostgREST can read the view when logged in
GRANT SELECT ON public.vw_member_companies TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT, INSERT ON public.company_memberships TO authenticated;

COMMIT;