/* E:\Projects\wageflow01\supabase\migrations\20260214213000_remove_company_memberships_user_id_uuid.sql */

-- 1) Update vw_member_companies to use user_id only (drop/recreate since nothing depends on it)
DROP VIEW IF EXISTS public.vw_member_companies;
CREATE VIEW public.vw_member_companies AS
SELECT DISTINCT
  c.id,
  c.name,
  c.created_at,
  m.user_id
FROM public.companies c
JOIN public.company_memberships m
  ON m.company_id = c.id
WHERE m.user_id = auth.uid();

-- 2) Update companies policy to use user_id only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='companies' AND policyname='companies_read_if_member'
  ) THEN
    EXECUTE $pol$
      ALTER POLICY "companies_read_if_member"
      ON public.companies
      USING (
        EXISTS (
          SELECT 1
          FROM public.company_memberships m
          WHERE m.company_id = companies.id
            AND m.user_id = auth.uid()
        )
      )
    $pol$;
  END IF;
END
$$;

-- 3) Drop obsolete triggers and trigger functions that referenced user_id_uuid
DROP TRIGGER IF EXISTS trg_fill_company_memberships_user_id_uuid ON public.company_memberships;
DROP TRIGGER IF EXISTS trg_company_memberships_sync_user_ids ON public.company_memberships;

DROP FUNCTION IF EXISTS public.trg_fill_company_memberships_user_id_uuid();
DROP FUNCTION IF EXISTS public.trg_sync_membership_user_ids();

-- 4) Drop index then drop the redundant column
DROP INDEX IF EXISTS public.idx_company_memberships_user_id_uuid;
ALTER TABLE public.company_memberships DROP COLUMN IF EXISTS user_id_uuid;

-- 5) Rewrite membership helper functions to use user_id only
CREATE OR REPLACE FUNCTION public.add_membership_by_name(p_company_name text, p_user uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company uuid;
BEGIN
  SELECT id INTO v_company
  FROM public.companies
  WHERE name = p_company_name;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Company % not found', p_company_name;
  END IF;

  INSERT INTO public.company_memberships (company_id, user_id, role)
  SELECT v_company, p_user, p_role
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.company_memberships cm
    WHERE cm.company_id = v_company
      AND cm.user_id = p_user
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.create_company_with_owner(p_company_id uuid, p_company_name text, p_owner_user_id uuid)
RETURNS TABLE(company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF p_company_name IS NULL OR length(trim(p_company_name)) = 0 THEN
    RAISE EXCEPTION 'Company name required';
  END IF;

  IF p_company_id IS NULL THEN
    p_company_id := gen_random_uuid();
  END IF;

  INSERT INTO public.companies (id, name, created_at, updated_at)
  VALUES (p_company_id, trim(p_company_name), v_now, v_now)
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name,
    updated_at = v_now;

  INSERT INTO public.company_memberships (company_id, user_id, role, created_at, updated_at)
  VALUES (p_company_id, p_owner_user_id, 'owner', v_now, v_now)
  ON CONFLICT (company_id, user_id) DO UPDATE SET
    role = excluded.role,
    updated_at = v_now;

  RETURN QUERY SELECT p_company_id::uuid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_member_of(p_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog, public, extensions, auth, wf_util'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_memberships cm
    WHERE cm.company_id = p_company
      AND cm.user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_owner_of(p_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog, public, extensions, auth, wf_util'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_memberships cm
    WHERE cm.company_id = p_company
      AND cm.role = 'owner'
      AND cm.user_id = auth.uid()
  );
$function$;
