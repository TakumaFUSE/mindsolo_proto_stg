# Legacy Table Audit (POST_LEGACY_AUDIT.md)

> 根拠: `legacy/mindsera_proto/src/lib/store.ts`, `mentor/page.tsx`, `types.ts`, `api/backfill/route.ts`
> 推定確度: ★★★ = コードから直接確認 / ★★ = 型定義から推定 / ★ = 慣習から推定

---

## 1. `journal_entries` ★★★

`store.ts` の INSERT/UPDATE/SELECT から全カラムを確認。

| カラム | 型 | 備考 |
|--------|-----|------|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | |
| `title` | text NOT NULL | legacy 独自。新スキーマ未定義 |
| `content` | text NOT NULL | |
| `word_count` | integer | legacy 独自 |
| `summary` | text | nullable |
| `art_url` | text | legacy 独自（週次アート画像） |
| `image_urls` | text[] | nullable |
| `emotion_analysis` | jsonb | Plutchik 8 感情分析結果。**削除対象** |
| `keyword_matrix` | jsonb | キーワードマトリックス。**削除対象** |
| `latitude` | double precision | 位置情報。**削除対象** |
| `longitude` | double precision | 位置情報。**削除対象** |
| `location_label` | text | 位置情報。**削除対象** |
| `topics` | text[] | 既にある（backfill で使用）|
| `deleted_at` | timestamptz | ソフトデリート |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

**新スキーマで追加が必要なカラム:** chain_id (uuid nullable), ai_status, tags, interpretation, helpful_info, related_entry_ids, search_vector

**存在が不明なカラム（診断 SQL で確認推奨）:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'journal_entries'
ORDER BY ordinal_position;
```

---

## 2. `custom_mentors` ★★★

`mentor/page.tsx` コメント内の CREATE TABLE SQL と INSERT から確認。

| カラム | 型 | 新スキーマとの差分 |
|--------|-----|------|
| `id` | uuid PK DEFAULT gen_random_uuid() | 同 |
| `user_id` | uuid NOT NULL FK | 同 |
| `name` | text NOT NULL | 同 |
| `role` | text NOT NULL | **legacy 独自**（新スキーマ未定義） |
| `description` | text NOT NULL | 新は nullable |
| `system_prompt` | text NOT NULL | 同 |
| `color` | text NOT NULL DEFAULT '#8B5CF6' | **legacy 独自** |
| `emoji` | text NOT NULL DEFAULT '✨' | **legacy 独自** |
| `created_at` | timestamptz DEFAULT now() | 同 |

**新スキーマで追加が必要なカラム:** `tone` text (nullable)

**legacy 独自カラム** (`role`, `color`, `emoji`) は新アプリには使われないが、既存データのため DROP しない。

---

## 3. `keyword_saves` ★★

`types.ts` の `KeywordSave` インターフェースから推定。実際の DB カラムはスネークケースになるはず。

| カラム | 型 | 備考 |
|--------|-----|------|
| `id` | uuid PK | |
| `entry_id` | uuid FK → journal_entries.id | |
| `keyword` | text NOT NULL | |
| `row_index` | integer NOT NULL | |
| `col_index` | integer NOT NULL | |
| `created_at` | timestamptz | |

**対応:** `keyword_saves_legacy_archive` にリネームのみ。新スキーマで未使用。

---

## 4. `mentor_conversations` ★★★

`mentor/page.tsx` の `loadConversation` / `saveConversation` から確認。

```javascript
// loadConversation:
supabase.from('mentor_conversations')
  .select('messages')
  .eq('persona_id', personaId)
  .maybeSingle()

// saveConversation:
supabase.from('mentor_conversations').upsert(
  { user_id: user.id, persona_id: personaId, messages, updated_at: '...' },
  { onConflict: 'user_id,persona_id' }
)
```

**→ Case M1 確定**: messages を jsonb 配列で1行に全件保存するパターン。

| カラム | 型 | 備考 |
|--------|-----|------|
| `id` | uuid PK DEFAULT gen_random_uuid() | upsert で省略されるので DEFAULT あり |
| `user_id` | uuid NOT NULL FK | |
| `persona_id` | text NOT NULL | 'stoic', 'cbt', 'psychologist', 'challenger' or custom UUID |
| `messages` | jsonb NOT NULL DEFAULT '[]' | `[{id, role, content}]` の配列 |
| `updated_at` | timestamptz | upsert で常に更新 |
| `created_at` | timestamptz DEFAULT now() | upsert で設定されないので DEFAULT 必須 |

**UNIQUE 制約:** `(user_id, persona_id)` — upsert の onConflict から確認。

**移行方針:** Case M1 → mentor_threads (1行/会話) + mentor_messages (メッセージを展開) に分割。

---

## 5. RLS ポリシー名の推定

`mentor/page.tsx` のコメントに:
```sql
CREATE POLICY "Users can manage their own custom mentors" ON custom_mentors ...
```

`journal_entries` のポリシー名は不明。確認用:
```sql
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('journal_entries','custom_mentors','keyword_saves','mentor_conversations');
```

---

## 推定確度が低い箇所（念のため確認推奨）

以下のクエリを Dashboard SQL Editor で実行して結果を確認すると、0000 migration の安全性が上がります:

```sql
-- テーブル一覧確認
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- journal_entries カラム一覧
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'journal_entries'
ORDER BY ordinal_position;

-- custom_mentors カラム一覧
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'custom_mentors'
ORDER BY ordinal_position;

-- mentor_conversations カラム一覧
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'mentor_conversations'
ORDER BY ordinal_position;

-- 既存 RLS ポリシー
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('journal_entries','custom_mentors','keyword_saves','mentor_conversations');

-- 既存インデックス
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('journal_entries','custom_mentors','keyword_saves','mentor_conversations')
ORDER BY tablename;
```
