# RUNTIME_BUG_TRIAGE.md

調査日: 2026-05-04 / Phase 8 着手前トリアージ

---

## A. /entry/[id] — ImageCarousel TypeError

**原因: 確定**

`app/src/components/entry-detail/ImageCarousel.tsx:4`
```ts
if (!imageUrls.length) return null   // ← imageUrls が null のとき TypeError
```

legacy `journal_entries` の `image_urls` カラムは nullable だった可能性がある。
`0000_legacy_reconcile.sql` の ADD COLUMN は:
```sql
ADD COLUMN IF NOT EXISTS image_urls  text[]  DEFAULT '{}'   -- NOT NULL 指定なし
```
`DEFAULT '{}'` は新規行にのみ適用され、既存行の値は変わらない。
よって migration 前から存在していた行が `image_urls = NULL` のまま残っており、
`null.length` で落ちる。

**修正方針:**
```ts
// ImageCarousel.tsx:4
if (!imageUrls?.length) return null
```
オプショナルチェーン1文字の修正で解消。`null`/`undefined` どちらも安全に扱える。

---

## B. POST /api/entries — 500 エラー

**原因: 未確定（2候補）**

### 候補 B-1: `supabase db push` 未適用（最有力）

本番 DB が legacy スキーマのままの場合:
- `entries` テーブルが存在しない（`journal_entries` のまま）
- `chains` テーブルが存在しない
- INSERT → `relation "entries" does not exist` → 500

`supabase db push` を実行済みかどうかが分岐点。

### 候補 B-2: `topics` カラム不在

`api/entries/route.ts` の INSERT:
```ts
supabase.from('entries').insert({
  user_id, chain_id, content, image_urls,
  ai_status: 'pending',
  topics,           // ← この列が DB に存在するか？
})
```

`topics` は **0001_init.sql には定義されていない**。
- legacy DB + 0000 適用済み → topics あり ✓
- fresh install で 0001 のみ適用、0003 未適用 → topics なし → 500

INSERT で渡している全フィールドと NOT NULL チェック:

| フィールド | DB NOT NULL | DEFAULT | INSERT で渡す | 問題 |
|---|---|---|---|---|
| user_id | ✓ | なし | ✓ | なし |
| chain_id | nullable | なし | ✓ | なし |
| content | ✓ | なし | ✓ | なし |
| image_urls | ✓ | '{}' | ✓ (空配列) | なし |
| ai_status | ✓ | 'pending' | ✓ | なし |
| topics | ✓ (0003適用後) | '{}' | ✓ | **列が存在しない場合に失敗** |
| tags | ✓ | '{}' | 渡さない | DEFAULT で補完 ✓ |
| related_entry_ids | ✓ | '{}' | 渡さない | DEFAULT で補完 ✓ |

**修正方針:**
1. まず `supabase db push` の適用確認（候補 B-1）
2. 適用済みなら `topics` 列の存在を確認（SELECT column_name から確認可）
3. 500 の詳細メッセージを見るため route.ts に `console.error(entryErr)` を追加してサーバーログを確認
4. 根本: DB が正しい状態に到達すれば route のコードは正しく動作する見込み

---

## C. mentor 系

### C-1. スレッドカードがタイトル・プレビュー無しで日付だけ

**原因: 確定**

`lib/mentor.ts` の `getThreads()` が `select('*')` で生の DB 行を返す:
```ts
const { data } = await supabase.from('mentor_threads').select('*')
return data as MentorThreadView[]
```

しかし DB の `mentor_threads` テーブルには `mentor_name`, `mentor_avatar`, `last_message` カラムが**存在しない**。
これらは dev fixtures にハードコードされた UI 用の計算フィールドであり、スキーマ定義には含まれていない。
→ 取得行の `mentor_name`/`mentor_avatar` が `undefined` → ThreadCard に表示できない。

**修正方針:**
`getThreads()` で JOIN またはサブクエリを使って mentor 名を解決する:
- `is_builtin = true` かつ `persona_id` あり → `PERSONAS` 定数からクライアント側で解決
- `is_builtin = false` かつ `mentor_id` あり → `custom_mentors` テーブルを JOIN して name を取得
- `last_message` は `mentor_messages` の最新1件を subquery で取得するか、UI 側でスキップ

---

### C-2. 既存カスタムメンターをタップしても遷移しない

**原因: 確定**

`/mentor/page.tsx` のカスタムメンター表示部分:
```tsx
{customMentors.map(m => (
  <div key={m.id} className="...">  {/* ← Link / onClick なし */}
    ...
  </div>
))}
```

タップしても何も起きない。カスタムメンターから会話を始めるフローが実装されていない。

**修正方針:**
カスタムメンターカードに「会話を始める」ボタンを追加し、
`POST /api/mentor-threads` with `{ mentor_id: m.id, is_builtin: false }` を呼んでスレッド作成 → `/mentor/${id}` に遷移。
ただし C-3 の `chain_id NOT NULL` 問題を先に解消する必要がある。

---

### C-3. ビルトインペルソナ選択しても会話が始まらない（thread 作成失敗）

**原因: 確定（2つの独立バグ）**

**バグ C-3a: `mentor_threads.chain_id NOT NULL` 違反**

`0001_init.sql`:
```sql
CREATE TABLE IF NOT EXISTS mentor_threads (
  chain_id    uuid    NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  ...
)
```

`PersonaCard` は chain_id を渡さない:
```ts
body: JSON.stringify({ persona_id: persona.id, is_builtin: true })
// chain_id を省略
```

`/api/mentor-threads/route.ts`:
```ts
.insert({
  chain_id: chain_id ?? null,   // → null → NOT NULL 制約違反 → 500
  ...
})
```

**修正方針:** スレッド作成時に `chains` テーブルに新規チェーンを先に INSERT し、その id を `chain_id` として渡す。
または `mentor_threads.chain_id` を nullable に変更する（`ALTER TABLE mentor_threads ALTER COLUMN chain_id DROP NOT NULL`）。
後者のほうがシンプルで、スレッドが必ずしもエントリ由来とは限らない設計に自然。

**バグ C-3b: `mentor_threads.mentor_id` FK が `user_mentors` を参照しているが、アプリは `custom_mentors` を使用**

`0001_init.sql`:
```sql
mentor_id   uuid   REFERENCES user_mentors(id) ON DELETE CASCADE
```

アプリコード (`api/mentors/route.ts`) は `custom_mentors` テーブルに INSERT している。
`user_mentors` テーブルはスキーマ定義のみで、アプリからは一度も書き込まれていない。
ビルトインペルソナの場合は `mentor_id = null` なので影響なし。
カスタムメンターから thread を作った場合（C-2 修正後）は `custom_mentors.id` を `mentor_id` に渡すことになり、
FK 違反 or 別テーブルとのズレが発生する。

**修正方針:**
- `mentor_threads.mentor_id` FK を `custom_mentors(id)` に向け直す migration を追加
- または `user_mentors` テーブルを廃止し、コードを `custom_mentors` に統一（現実装と一致させる）

---

### C-4. /mentor/add 保存に失敗する

**原因: 確定**

legacy `custom_mentors` テーブルには `role text NOT NULL`（default なし）が存在する。
`0000_legacy_reconcile.sql` は `tone` カラムを追加するだけで `role` は変えない。
`0002_mentor.sql` の `CREATE TABLE IF NOT EXISTS custom_mentors` は既存テーブルがあるためスキップされる。

よって本番 DB の `custom_mentors` は legacy スキーマのまま (`role NOT NULL` あり)。
新規 INSERT では `role` を渡していない → NOT NULL 制約違反 → 500。

```ts
// api/mentors/route.ts
supabase.from('custom_mentors').insert({
  user_id, name, description, system_prompt, tone
  // role がない → 本番 DB でエラー
})
```

**修正方針:**
```sql
-- 追加 migration で role にデフォルトを設定し NOT NULL を緩和
ALTER TABLE custom_mentors ALTER COLUMN role SET DEFAULT 'mentor';
-- または DROP NOT NULL
ALTER TABLE custom_mentors ALTER COLUMN role DROP NOT NULL;
```
これを 0005 migration として追加し `supabase db push` で適用する。

---

### 共通: user_mentors vs custom_mentors の判定

| 項目 | user_mentors | custom_mentors |
|---|---|---|
| 定義場所 | 0001_init.sql | 0000 (legacy保持) + 0002 |
| アプリが読み書き | **なし** | **全て** |
| `mentor_threads.mentor_id` FK 参照先 | **ここ** ← ズレ | ここではない |
| legacy DB に実データ | なし（新規テーブル） | あり（legacy custom_mentors） |

**結論: `custom_mentors` が正。`user_mentors` は定義のみで死んでいる。**
`mentor_threads.mentor_id` の FK を `custom_mentors` に付け替える migration が必要。

---

## 修正優先順位（Phase 8 実装）

| 優先 | バグ | 影響範囲 | 修正コスト |
|---|---|---|---|
| P0 | A: ImageCarousel null | 全 legacy エントリ詳細でクラッシュ | 1行 |
| P0 | C-3a: chain_id NOT NULL | ペルソナ選択できない | migration 1行 + API修正 |
| P0 | B: entries 500 | 日記が書けない | DB 状態確認後 |
| P1 | C-4: custom_mentors role NOT NULL | メンター作成できない | migration 1行 |
| P1 | C-1: mentor_name undefined | スレッド一覧が空 | getThreads JOIN修正 |
| P2 | C-2: カスタムメンター遷移なし | カスタムメンターから会話できない | UI追加 |
| P2 | C-3b: mentor_id FK先ミスマッチ | カスタム × thread作成時FK違反 | migration FK付け替え |
