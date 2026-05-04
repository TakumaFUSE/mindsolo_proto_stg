-- Phase 9-4: final removal of legacy archive tables
--
-- Prerequisites before running:
--   1. docs/legacy_archive_final_counts.sql executed and result saved
--   2. Backup confirmed: .backups/legacy_archives_20260504_211022.sql (61 KB)
--   3. Production app verified against real DB (Phases 9-1 through 9-3)

DROP TABLE IF EXISTS public.keyword_saves_legacy_archive;
DROP TABLE IF EXISTS public.mentor_conversations_legacy_archive;
DROP TABLE IF EXISTS public.user_mentors_legacy_archive;
DROP TABLE IF EXISTS public.journal_entries_legacy_archive;
