/* E:\Projects\wageflow01\supabase\migrations\20260214194500_harden_company_memberships_select_policy_roles.sql */

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_memberships' AND policyname='cm_select_self'
  ) THEN
    EXECUTE 'ALTER POLICY "cm_select_self" ON public.company_memberships TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_memberships' AND policyname='cm_select_service'
  ) THEN
    EXECUTE 'ALTER POLICY "cm_select_service" ON public.company_memberships TO service_role';
  END IF;
END
$$;
