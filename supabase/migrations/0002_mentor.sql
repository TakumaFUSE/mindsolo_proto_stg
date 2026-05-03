-- =============================================================
-- Phase 6: mentor persona support (idempotent)
-- =============================================================

-- ── custom_mentors ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_mentors (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  system_prompt text        NOT NULL,
  tone          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_mentors_user_created_idx
  ON custom_mentors (user_id, created_at DESC);

ALTER TABLE custom_mentors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "own custom mentors" ON custom_mentors;
END $$;
CREATE POLICY "own custom mentors" ON custom_mentors
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── mentor_threads: add persona support ───────────────────────
-- mentor_id is already nullable in 0001; this is a safe no-op
ALTER TABLE mentor_threads
  ALTER COLUMN mentor_id DROP NOT NULL;

ALTER TABLE mentor_threads
  ADD COLUMN IF NOT EXISTS persona_id  text,
  ADD COLUMN IF NOT EXISTS is_builtin  boolean NOT NULL DEFAULT false;

ALTER TABLE mentor_threads
  DROP CONSTRAINT IF EXISTS mentor_threads_source_check;

ALTER TABLE mentor_threads
  ADD CONSTRAINT mentor_threads_source_check
  CHECK (
    (is_builtin = true  AND persona_id IS NOT NULL AND mentor_id IS NULL) OR
    (is_builtin = false AND mentor_id  IS NOT NULL AND persona_id IS NULL) OR
    (is_builtin = false AND mentor_id  IS NULL     AND persona_id IS NULL)
  );

-- ── Data migration: mentor_conversations_legacy_archive ───────
-- Runs only when the archive table exists (i.e. 0000 was applied to a legacy DB).
-- Each archive row holds a full conversation as JSONB: [{id, role, content}]
-- → 1 chain + 1 mentor_thread (is_builtin=true) + N mentor_messages
DO $$
DECLARE
  conv          RECORD;
  msg           RECORD;
  ord           bigint;
  new_chain_id  uuid;
  new_thread_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'mentor_conversations_legacy_archive'
  ) THEN
    RETURN;
  END IF;

  FOR conv IN
    SELECT *
    FROM   mentor_conversations_legacy_archive
    WHERE  messages IS NOT NULL
      AND  jsonb_array_length(messages) > 0
  LOOP
    INSERT INTO chains (user_id, created_at, updated_at)
    VALUES (
      conv.user_id,
      COALESCE(conv.created_at, now()),
      COALESCE(conv.updated_at, now())
    )
    RETURNING id INTO new_chain_id;

    INSERT INTO mentor_threads
      (user_id, chain_id, persona_id, is_builtin, title, created_at, updated_at)
    VALUES (
      conv.user_id,
      new_chain_id,
      conv.persona_id,
      true,
      NULL,
      COALESCE(conv.created_at, now()),
      COALESCE(conv.updated_at, now())
    )
    RETURNING id INTO new_thread_id;

    ord := 1;
    FOR msg IN
      SELECT value AS elem
      FROM   jsonb_array_elements(conv.messages)
    LOOP
      INSERT INTO mentor_messages (thread_id, role, content, created_at)
      VALUES (
        new_thread_id,
        COALESCE(msg.elem->>'role',    'user'),
        COALESCE(msg.elem->>'content', ''),
        COALESCE(conv.created_at, now()) + ((ord - 1) * interval '1 second')
      );
      ord := ord + 1;
    END LOOP;
  END LOOP;
END $$;
