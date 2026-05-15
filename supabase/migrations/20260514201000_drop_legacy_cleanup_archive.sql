-- Drops a temporary cleanup archive table created during prior development cleanup.
-- Reviewed on 2026-05-14.
-- Table contained only old company_settings_backup and host_profiles archive rows.
-- No runtime code references this table.
-- No policies, triggers, inbound FKs, or outbound FKs were found.

DROP TABLE IF EXISTS public.legacy_cleanup_archive_20260429;