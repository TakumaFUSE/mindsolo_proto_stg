-- =============================================================
-- Phase 7-2: topics extraction support
-- entries.topics: array of Japanese short phrases (AI-extracted)
-- =============================================================

-- Add topics column if it doesn't exist
ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}';

-- Index for chain assignment lookups (filter by user, sort by created_at)
CREATE INDEX IF NOT EXISTS entries_user_created_topics
  ON entries (user_id, created_at DESC)
  WHERE deleted_at IS NULL;
