-- Phase 9-3: drop unused legacy columns from entries
-- art_url and framework_id were inherited from the legacy proto schema
-- and have no references in the current application code.

ALTER TABLE entries DROP COLUMN IF EXISTS art_url;
ALTER TABLE entries DROP COLUMN IF EXISTS framework_id;
