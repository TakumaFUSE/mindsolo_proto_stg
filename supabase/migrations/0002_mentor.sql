-- Phase 6: mentor persona support
-- Adds custom_mentors table and extends mentor_threads for built-in personas

-- ── custom_mentors ────────────────────────────────────────────
CREATE TABLE custom_mentors (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  system_prompt text        NOT NULL,
  tone          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON custom_mentors (user_id, created_at DESC);

ALTER TABLE custom_mentors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own custom mentors" ON custom_mentors
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── mentor_threads: add persona support ───────────────────────
ALTER TABLE mentor_threads
  ALTER COLUMN mentor_id DROP NOT NULL,
  ADD COLUMN persona_id  text,
  ADD COLUMN is_builtin  boolean NOT NULL DEFAULT false;

-- Ensure either mentor_id or persona_id is set
ALTER TABLE mentor_threads
  ADD CONSTRAINT mentor_threads_source_check
  CHECK (
    (is_builtin = true AND persona_id IS NOT NULL AND mentor_id IS NULL) OR
    (is_builtin = false AND mentor_id IS NOT NULL AND persona_id IS NULL) OR
    (is_builtin = false AND mentor_id IS NULL AND persona_id IS NULL)
  );
