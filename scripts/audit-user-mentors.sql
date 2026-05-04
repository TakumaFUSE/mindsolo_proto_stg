-- user_mentors 廃止前監査
-- Supabase Dashboard の SQL Editor で実行してください。
-- 0007 適用前に実行すること（リネーム後はテーブル名が変わる）。

-- 1. 行数確認（0 であれば即 DROP 可能）
SELECT COUNT(*) AS user_mentors_count FROM user_mentors;

-- 2. サンプル確認
SELECT * FROM user_mentors LIMIT 5;

-- 3. custom_mentors に存在しないレコードがあるか
--    （両テーブルで id が一致しないレコード = 移行漏れ）
SELECT COUNT(*) AS only_in_user_mentors
FROM user_mentors u
WHERE NOT EXISTS (
  SELECT 1 FROM custom_mentors c WHERE c.id = u.id
);

-- 4. mentor_threads から user_mentors を参照しているレコードがあるか
--    （0005 で FK を付け替え済みのはずだが念のため確認）
SELECT COUNT(*) AS threads_referencing_user_mentors
FROM mentor_threads mt
WHERE mt.mentor_id IN (SELECT id FROM user_mentors);
