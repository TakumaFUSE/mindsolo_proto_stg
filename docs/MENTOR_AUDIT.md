# MENTOR_AUDIT.md

mentor 系バグ調査用 SQL — Supabase Dashboard の SQL Editor で実行してください。

---

## 1. テーブル存在確認

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'entries', 'chains',
    'mentor_threads', 'mentor_messages',
    'custom_mentors', 'user_mentors',
    'mentor_conversations_legacy_archive'
  )
ORDER BY tablename;
```

期待値: 上記7テーブルが全て存在すること（`supabase db push` 適用済みなら）。

---

## 2. カラム構造の確認

### 2-a. entries のカラム（topics / image_urls の nullable 確認）

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'entries'
ORDER BY ordinal_position;
```

確認ポイント:
- `topics` が存在するか（0003 適用確認）
- `image_urls` の `is_nullable` が YES になっていないか（YES なら legacy NULL 行が存在する）

### 2-b. custom_mentors のカラム（role NOT NULL 確認）

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'custom_mentors'
ORDER BY ordinal_position;
```

確認ポイント:
- `role` カラムの `is_nullable` が NO かつ `column_default` が NULL → C-4 の根本原因確定

### 2-c. mentor_threads のカラム（chain_id NOT NULL / persona_id / is_builtin 確認）

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'mentor_threads'
ORDER BY ordinal_position;
```

確認ポイント:
- `chain_id` の `is_nullable` が NO → C-3a の根本原因確定
- `persona_id`, `is_builtin` が存在するか（0002 適用確認）

---

## 3. 件数確認

### 3-a. 全テーブルの件数

```sql
SELECT
  'entries'                             AS tbl, COUNT(*) FROM entries
UNION ALL SELECT
  'chains',                                      COUNT(*) FROM chains
UNION ALL SELECT
  'mentor_threads',                              COUNT(*) FROM mentor_threads
UNION ALL SELECT
  'mentor_messages',                             COUNT(*) FROM mentor_messages
UNION ALL SELECT
  'custom_mentors',                              COUNT(*) FROM custom_mentors
UNION ALL SELECT
  'user_mentors',                                COUNT(*) FROM user_mentors
UNION ALL SELECT
  'mentor_conversations_legacy_archive',         COUNT(*) FROM mentor_conversations_legacy_archive;
```

### 3-b. entries の image_urls NULL 件数

```sql
SELECT
  COUNT(*) FILTER (WHERE image_urls IS NULL)     AS image_urls_null,
  COUNT(*) FILTER (WHERE image_urls IS NOT NULL) AS image_urls_not_null,
  COUNT(*) FILTER (WHERE topics = '{}')          AS topics_empty,
  COUNT(*) FILTER (WHERE chain_id IS NULL)       AS chain_null
FROM entries;
```

---

## 4. mentor_threads サンプル

```sql
SELECT
  id,
  is_builtin,
  persona_id,
  mentor_id,
  chain_id,
  title,
  created_at
FROM mentor_threads
ORDER BY created_at DESC
LIMIT 10;
```

確認ポイント:
- `chain_id` が NULL になっている行があれば、migration 前に別手段で作られた行
- `persona_id` / `is_builtin` が存在しない場合、0002 未適用

---

## 5. legacy migration → 新テーブルへの移行確認

```sql
-- 移行元: mentor_conversations_legacy_archive の件数・サンプル
SELECT
  user_id,
  persona_id,
  jsonb_array_length(messages) AS msg_count,
  created_at
FROM mentor_conversations_legacy_archive
ORDER BY created_at DESC
LIMIT 5;

-- 移行先: is_builtin=true のスレッドと紐づくメッセージ件数
SELECT
  t.persona_id,
  COUNT(DISTINCT t.id)  AS thread_count,
  COUNT(m.id)           AS message_count
FROM mentor_threads t
LEFT JOIN mentor_messages m ON m.thread_id = t.id
WHERE t.is_builtin = true
GROUP BY t.persona_id
ORDER BY thread_count DESC;
```

期待値: `mentor_conversations_legacy_archive` の各 `persona_id` に対応する
`mentor_threads` が同件数存在し、メッセージ数が一致すること。

---

## 6. custom_mentors サンプル（INSERT で失敗するカラム確認）

```sql
SELECT id, name, role, description, system_prompt, tone, created_at
FROM custom_mentors
ORDER BY created_at DESC
LIMIT 5;
```

`role` カラムが NULL でない行 = legacy に作成済みの行。
新規 INSERT で `role` を省略すると NOT NULL 違反が起きる。

---

## 7. mentor_threads FK 参照先の確認

```sql
-- mentor_threads.mentor_id が参照しているテーブルを確認
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name  AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'mentor_threads'
ORDER BY kcu.column_name;
```

期待値 (問題の確認):
- `mentor_id` → `user_mentors(id)` になっているはず（`custom_mentors` の誤り）
