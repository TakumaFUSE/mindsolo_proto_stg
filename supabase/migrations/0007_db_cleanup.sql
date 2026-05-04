-- Phase 9 DB cleanup

-- 1. legacy primary key 制約名を entries に合わせてリネーム
--    (journal_entries → entries リネーム時に制約名が旧名のまま残るため)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'journal_entries_pkey'
      AND conrelid = 'entries'::regclass
  ) THEN
    ALTER TABLE entries RENAME CONSTRAINT journal_entries_pkey TO entries_pkey;
  END IF;
END $$;

-- 2. 重複インデックス削除（legacy journal_entries 由来の冗長インデックス）
DROP INDEX IF EXISTS public.entries_user_created_topics;

-- 3. custom_mentors の重複ポリシー削除
--    legacy テーブルには "Users can manage their own custom mentors" という別名ポリシーが
--    存在する場合があるため DROP して "own custom mentors" に一本化
DROP POLICY IF EXISTS "Users can manage their own custom mentors" ON public.custom_mentors;

-- 4. user_mentors を legacy archive にリネーム
--    アプリコードは custom_mentors に統一済み（Phase 8 / 0005）。
--    即 DROP はせず Phase 9-4 で削除予定。
ALTER TABLE IF EXISTS user_mentors
  RENAME TO user_mentors_legacy_archive;
