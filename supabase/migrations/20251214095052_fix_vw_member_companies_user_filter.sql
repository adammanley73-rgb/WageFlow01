-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251214095052_fix_vw_member_companies_user_filter.sql
-- Fix vw_member_companies so it returns only companies for the current authenticated user.
-- Prevents duplicate company rows (one per membership) in the UI.
-- Defensive: only create view if required tables exist

DO $$
BEGIN
  -- Check if both required tables exist
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'company_memberships'
  ) AND EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'companies'
  ) THEN
    -- Drop existing view if it exists
    DROP VIEW IF EXISTS public.vw_member_companies;
    
    -- Create the view
    EXECUTE '
      CREATE OR REPLACE VIEW public.vw_member_companies AS
      SELECT DISTINCT
        c.id,
        c.name,
        c.created_at,
        m.user_id_uuid
      FROM public.companies c
      JOIN public.company_memberships m ON m.company_id = c.id
      WHERE m.user_id_uuid = auth.uid()
    ';
    
    RAISE NOTICE 'Created vw_member_companies view.';
  ELSE
    RAISE NOTICE 'Required tables (companies, company_memberships) do not exist, skipping view creation.';
  END IF;
END $$;
