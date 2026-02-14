/* E:\Projects\wageflow01\supabase\migrations\20260214190000_harden_company_memberships_policy_roles.sql */

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_memberships' AND policyname='cm_insert_self'
  ) THEN
    EXECUTE 'ALTER POLICY "cm_insert_self" ON public.company_memberships TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_memberships' AND policyname='cm_update_self'
  ) THEN
    EXECUTE 'ALTER POLICY "cm_update_self" ON public.company_memberships TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_memberships' AND policyname='cm_delete_self'
  ) THEN
    EXECUTE 'ALTER POLICY "cm_delete_self" ON public.company_memberships TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_memberships' AND policyname='cm_insert_service'
  ) THEN
    EXECUTE 'ALTER POLICY "cm_insert_service" ON public.company_memberships TO service_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_memberships' AND policyname='cm_update_service'
  ) THEN
    EXECUTE 'ALTER POLICY "cm_update_service" ON public.company_memberships TO service_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_memberships' AND policyname='cm_delete_service'
  ) THEN
    EXECUTE 'ALTER POLICY "cm_delete_service" ON public.company_memberships TO service_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_memberships' AND policyname='company_memberships_no_direct_insert'
  ) THEN
    EXECUTE 'DROP POLICY "company_memberships_no_direct_insert" ON public.company_memberships';
  END IF;
END
$$;
