/* E:\Projects\wageflow01\supabase\migrations\20260214201500_company_memberships_remove_user_id_uuid_policy_refs.sql */

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_memberships' AND policyname='company_memberships_insert_own'
  ) THEN
    EXECUTE 'ALTER POLICY "company_memberships_insert_own" ON public.company_memberships WITH CHECK (user_id = auth.uid())';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_memberships' AND policyname='company_memberships_select_own'
  ) THEN
    EXECUTE 'ALTER POLICY "company_memberships_select_own" ON public.company_memberships USING (user_id = auth.uid())';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_memberships' AND policyname='company_memberships_read_own'
  ) THEN
    EXECUTE 'ALTER POLICY "company_memberships_read_own" ON public.company_memberships USING (user_id = auth.uid())';
  END IF;
END
$$;
