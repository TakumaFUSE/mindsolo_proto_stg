-- Phase 8 bug fixes

-- C-3a: mentor_threads.chain_id を nullable に変更
-- スレッドはエントリ由来とは限らないため NOT NULL は不要
ALTER TABLE mentor_threads
  ALTER COLUMN chain_id DROP NOT NULL;

-- C-4: custom_mentors.role の NOT NULL 制約を緩和し DEFAULT を設定
ALTER TABLE custom_mentors
  ALTER COLUMN role SET DEFAULT 'mentor';
ALTER TABLE custom_mentors
  ALTER COLUMN role DROP NOT NULL;

-- C-3b: mentor_threads.mentor_id FK を user_mentors → custom_mentors に付け替え
ALTER TABLE mentor_threads
  DROP CONSTRAINT IF EXISTS mentor_threads_mentor_id_fkey;

ALTER TABLE mentor_threads
  ADD CONSTRAINT mentor_threads_mentor_id_fkey
  FOREIGN KEY (mentor_id) REFERENCES custom_mentors(id) ON DELETE SET NULL;
