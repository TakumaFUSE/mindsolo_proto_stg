-- Phase 9-4 DROP 直前の件数確認
-- supabase db push 実行前に Supabase Dashboard の SQL Editor で実行し、
-- 結果をスクリーンショットまたはメモとして保管すること。

SELECT 'keyword_saves_legacy_archive'         AS t, COUNT(*) AS c FROM keyword_saves_legacy_archive
UNION ALL
SELECT 'mentor_conversations_legacy_archive', COUNT(*) FROM mentor_conversations_legacy_archive
UNION ALL
SELECT 'user_mentors_legacy_archive',         COUNT(*) FROM user_mentors_legacy_archive;
