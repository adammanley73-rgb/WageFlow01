-- Create wf_util schema for utility functions
-- This schema must exist before migrations reference it

BEGIN;

-- Create the schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS wf_util;

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA wf_util TO authenticated;
GRANT USAGE ON SCHEMA wf_util TO service_role;

COMMIT;
