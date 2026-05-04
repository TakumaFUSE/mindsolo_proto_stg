-- =============================================================
-- editlife 0000: legacy reconcile
-- 旧テーブル構成（journal_entries / custom_mentors / keyword_saves /
-- mentor_conversations）を新スキーマと整合させる。
--
-- ⚠ 前提: Supabase Dashboard でバックアップ取得済みであること。
-- ⚠ 実行順: 必ず 0001_init.sql より先に適用すること。
--
-- 実行後の状態:
--   journal_entries        → entries (リネーム + カラム追加/削除)
--   custom_mentors         → そのまま + tone カラム追加
--   keyword_saves          → keyword_saves_legacy_archive (リネーム)
--   mentor_conversations   → mentor_conversations_legacy_archive (リネーム)
--   chains / mentor_threads / mentor_messages は 0001 で新規作成
--   mentor_conversations の実データ移行は 0002 末尾で実施
-- =============================================================

-- ── pg_trgm 拡張（entries.content の GIN インデックスに必要）──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── set_updated_at 関数（0001 でも OR REPLACE するが先に置く） ──
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================
-- STEP 1: journal_entries → entries
-- =============================================================

-- 旧テーブル名のままポリシーが残っている場合は削除
DO $$ DECLARE pol text; BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'journal_entries'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON journal_entries', pol);
  END LOOP;
END $$;

-- 旧テーブル名の updated_at トリガーを削除（0001 で再作成）
DROP TRIGGER IF EXISTS set_updated_at ON journal_entries;

ALTER TABLE IF EXISTS journal_entries RENAME TO entries;

-- =============================================================
-- STEP 2: entries に新カラムを追加
-- =============================================================

ALTER TABLE IF EXISTS entries
  -- chain_id: nullable + 外部キーなし（chains は 0001 で作成。バックフィル後に制約追加可）
  ADD COLUMN IF NOT EXISTS chain_id            uuid,
  -- ai_status: legacy エントリは生成済み扱いで 'done' にする
  ADD COLUMN IF NOT EXISTS ai_status           text
                             NOT NULL DEFAULT 'done'
                             CHECK (ai_status IN ('pending','processing','done','error')),
  ADD COLUMN IF NOT EXISTS tags                text[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interpretation      text,
  ADD COLUMN IF NOT EXISTS helpful_info        text,
  ADD COLUMN IF NOT EXISTS related_entry_ids   uuid[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS search_vector       tsvector,
  ADD COLUMN IF NOT EXISTS topics              text[]    NOT NULL DEFAULT '{}';

-- image_urls: legacy では text[] nullable の可能性があるため NOT NULL DEFAULT '{}' に統一
-- ADD COLUMN IF NOT EXISTS は型変更しないので、nullable のまま残る場合がある
-- → NOT NULL 化はバックフィル後に別途実施
ALTER TABLE IF EXISTS entries
  ADD COLUMN IF NOT EXISTS image_urls  text[]  DEFAULT '{}';

-- deleted_at: legacy にある想定だが念のため
ALTER TABLE IF EXISTS entries
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

-- =============================================================
-- STEP 3: entries から legacy 専用カラムを削除
-- （emotion_analysis / keyword_matrix / latitude / longitude /
--   location_label のみ削除。title / word_count / art_url は温存）
-- =============================================================

ALTER TABLE IF EXISTS entries
  DROP COLUMN IF EXISTS keyword_matrix,
  DROP COLUMN IF EXISTS emotion_analysis,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS location_label;

-- =============================================================
-- STEP 4: entries のインデックスを追加
-- =============================================================

CREATE INDEX IF NOT EXISTS entries_chain_created_idx
  ON entries (chain_id, created_at ASC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS entries_user_ai_status_idx
  ON entries (user_id, ai_status)
  WHERE ai_status IN ('pending','processing');

CREATE INDEX IF NOT EXISTS entries_user_created_idx
  ON entries (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS entries_search_vector_idx
  ON entries USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS entries_content_trgm_idx
  ON entries USING GIN (content gin_trgm_ops);

-- =============================================================
-- STEP 5: entries の RLS を新テーブル名で再設定
-- =============================================================

ALTER TABLE IF EXISTS entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'entries' AND policyname = 'own entries'
  ) THEN
    CREATE POLICY "own entries" ON entries
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at トリガーを entries 名で再作成
DROP TRIGGER IF EXISTS set_updated_at ON entries;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Supabase Realtime への追加（既に登録済みの場合は EXCEPTION を握りつぶす）
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE entries;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================
-- STEP 6: custom_mentors に不足カラムを追加
-- （legacy: id, user_id, name, role, description NOT NULL,
--   system_prompt, color, emoji, created_at）
-- （新: id, user_id, name, description nullable, system_prompt,
--   tone, created_at）
-- → role / color / emoji は削除せず温存。tone を追加。
-- =============================================================

ALTER TABLE IF EXISTS custom_mentors
  ADD COLUMN IF NOT EXISTS tone text;

-- description が NOT NULL だった場合も ALTER COLUMN は危険なので温存

-- 既存 RLS ポリシーが旧名称の場合に備えて再設定
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'custom_mentors' AND policyname = 'own custom mentors'
  ) THEN
    ALTER TABLE IF EXISTS custom_mentors ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "own custom mentors" ON custom_mentors
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- =============================================================
-- STEP 7: keyword_saves → keyword_saves_legacy_archive
-- =============================================================

ALTER TABLE IF EXISTS keyword_saves
  RENAME TO keyword_saves_legacy_archive;

-- =============================================================
-- STEP 8: mentor_conversations → mentor_conversations_legacy_archive
-- 実データの mentor_threads / mentor_messages への移行は
-- chains と persona 対応カラムが揃う 0002 末尾で実施する。
-- =============================================================

ALTER TABLE IF EXISTS mentor_conversations
  RENAME TO mentor_conversations_legacy_archive;
