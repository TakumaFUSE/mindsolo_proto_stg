-- discover_cache: stores AI-generated personalized recommendations per user
-- TTL is enforced at read time (24 hours)

CREATE TABLE IF NOT EXISTS discover_cache (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topics_hash text NOT NULL,
  payload     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discover_cache_lookup
  ON discover_cache (user_id, topics_hash, created_at DESC);

ALTER TABLE discover_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own discover cache"
  ON discover_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own discover cache"
  ON discover_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own discover cache"
  ON discover_cache FOR DELETE
  USING (auth.uid() = user_id);
