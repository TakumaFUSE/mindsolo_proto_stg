# editlife API 契約書 (API_CONTRACTS.md)

> 実装対象: `app/` (Next.js 16, App Router)  
> AI モデル: `claude-haiku-4-5-20251001`（全 AI ルート共通）  
> 認証: Supabase Auth セッション（Cookie ベース SSR）
>
> **ルール:** CRUD 操作は Supabase クライアントを直接使用し、API ルートを経由しない。  
> API ルートは「Claude API を呼ぶ処理」と「Cron ジョブ」に限定する。

---

## 共通仕様

### 認証ヘッダー

ユーザー向けルート: Supabase の Cookie セッションを `@supabase/ssr` で検証。未認証は `401`。

Cron ルート: Vercel が付与する `Authorization: Bearer ${CRON_SECRET}` ヘッダーを検証。不一致は `401`。

### フィーチャーフラグ

```typescript
// src/lib/plan-features.ts
export const PLAN_FEATURES = {
  entry_ai_processing:    'free',
  mentor_chat:            'free',
  discover:               'free',
  reflection_suggestions: 'free',
} satisfies Record<string, 'free' | 'pro'>

// Middleware: プランが必要水準を満たさなければ 403 を返す
// 現フェーズは全機能 'free' のため実質スルー
```

### エラー形式

```typescript
// 全エラーレスポンスで共通
type ErrorResponse = {
  error: string   // 人間可読メッセージ
  code?: string   // 機械可読コード（任意）
}
```

| ステータス | 意味 |
|-----------|------|
| 400 | バリデーションエラー |
| 401 | 未認証 |
| 403 | プランによるアクセス制限 |
| 404 | リソース未存在（または他ユーザーのリソース） |
| 500 | サーバー / Claude API エラー |

---

## 1. エントリ AI 処理

### `POST /api/entries/[id]/process`

**概要:** 保存済みエントリに対して Claude を呼び、AI フィールドを一括生成する。  
エントリ保存直後にクライアントが fire-and-forget で呼び出す（レスポンスは待たない）。

**フィーチャーフラグ:** `entry_ai_processing`  
**認証:** ユーザーセッション必須

#### リクエスト

```
POST /api/entries/[id]/process
Content-Type: application/json
(body なし)
```

#### 処理フロー

1. `entries` テーブルから `id` のレコードを取得（`user_id = auth.uid()` で所有者確認）
2. `ai_status = 'processing'` に更新
3. 直近30件のエントリIDリストを取得（類似度計算用）
4. Claude API を呼び出す（下記プロンプト参照）
5. 成功: AI フィールドを更新し `ai_status = 'done'`
6. 失敗: `ai_status = 'error'` に更新
7. `chains.updated_at` は変更しない（エントリ内容更新のみ）

#### Claude API 呼び出し仕様

```
モデル: claude-haiku-4-5-20251001
方式: 非ストリーミング（tool_use）
```

**ツール定義:**

```typescript
const ENTRY_PROCESS_TOOL = {
  name: 'process_entry',
  description: 'ジャーナルエントリを解釈し、構造化データを返す',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'エントリの要約。1〜2文。',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'ライフスタイルタグ。1〜3件。例: ["集中","読書"]',
        minItems: 1,
        maxItems: 3,
      },
      interpretation: {
        type: 'string',
        description: 'このエントリに込められた感情・欲求・パターンの解釈。2〜4文。',
      },
      helpful_info: {
        type: 'string',
        description: 'このエントリを踏まえた気の利く情報・視点・次の問い。2〜4文。',
      },
      related_entry_ids: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        description: '意味的に関連する既存エントリのID。最大2件。',
        maxItems: 2,
      },
    },
    required: ['summary', 'tags', 'interpretation', 'helpful_info', 'related_entry_ids'],
  },
}
```

**システムプロンプト要点:**
- ユーザーの自己理解を深めるパーソナルジャーナリングアシスタントとして振る舞う
- タグは `集中 / 旅 / 習慣 / 内省 / 読書 / 健康 / 仕事 / 学習 / 創造 / 人間関係` から選ぶ
- `related_entry_ids` には提供された既存エントリリストの ID のみを使用する
- 日本語で出力する

#### レスポンス

```typescript
// 202 Accepted（クライアントは待たない）
type ProcessResponse = {
  status: 'accepted'
  entryId: string
}
```

#### エラー

```
404: エントリが存在しない / 他ユーザーのエントリ
409: ai_status が既に 'processing' または 'done'（重複実行防止）
500: Claude API エラー（この場合 ai_status = 'error' に更新済み）
```

---

## 2. メンターチャット

### `POST /api/mentor/[threadId]/messages`

**概要:** ユーザーメッセージを受け取り、AI 応答をストリーミングで返す。  
同時に user / assistant 両メッセージを `mentor_messages` に永続保存する。

**フィーチャーフラグ:** `mentor_chat`  
**認証:** ユーザーセッション必須

#### リクエスト Zod スキーマ

```typescript
import { z } from 'zod'

export const MentorMessageSchema = z.object({
  content:   z.string().min(1).max(10_000),
  imageUrls: z.array(z.string().url()).max(5).default([]),
})
export type MentorMessageInput = z.infer<typeof MentorMessageSchema>
```

#### 処理フロー

1. `mentor_threads` から `threadId` を取得（所有者確認）
2. `user_mentors` からメンターの `system_prompt` を取得
3. 同 Thread の `mentor_messages` を全件取得（会話履歴）
4. 同 `chain_id` に属する Entry の `content` をシステムプロンプトに追記
5. `mentor_messages` に user メッセージを INSERT
6. `streamText()` でストリーミングレスポンス開始
7. 完了後、assistant メッセージを `mentor_messages` に INSERT
8. `mentor_threads.updated_at` を更新

#### Claude API 呼び出し仕様

```
モデル: claude-haiku-4-5-20251001
方式: Vercel AI SDK streamText()
```

**システムプロンプト構成:**

```
{mentor.system_prompt}

---
## ユーザーの関連ジャーナル
{同 chain に属する Entry の content を時系列順で連結}
```

**入力メッセージ:** `mentor_messages` の全履歴 + 今回の `content` / `imageUrls`

#### レスポンス

```
200: text/event-stream（Vercel AI SDK StreamingTextResponse）
```

#### エラー

```
400: バリデーションエラー
404: threadId が存在しない / 他ユーザーのスレッド
500: Claude API / DB エラー
```

---

## 3. メンターおすすめ候補生成

### `POST /api/mentor-add/suggest`

**概要:** ユーザーの直近エントリを元に AI が 2〜3 件のメンターペルソナ案を生成する。  
mentor_add 画面の初回表示時に呼び出す。React state にキャッシュし、再遷移では再呼び出しない。

**フィーチャーフラグ:** なし（全プラン）  
**認証:** ユーザーセッション必須

#### リクエスト

```
POST /api/mentor-add/suggest
(body なし)
```

#### 処理フロー

1. `entries` から直近5件の `content` を取得（`deleted_at IS NULL`, `created_at DESC`）
2. エントリが0件なら固定デフォルト提案を返す（Claude を呼ばない）
3. Claude API でペルソナ案を生成（tool_use）

#### Claude API 呼び出し仕様

```
モデル: claude-haiku-4-5-20251001
方式: 非ストリーミング（tool_use）
```

**ツール定義:**

```typescript
const SUGGEST_MENTOR_TOOL = {
  name: 'suggest_mentors',
  input_schema: {
    type: 'object',
    properties: {
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:         { type: 'string', description: 'メンター名。10文字以内。' },
            description:  { type: 'string', description: 'このメンターが向いている人・状況の説明。30文字以内。' },
            systemPrompt: { type: 'string', description: 'メンターのシステムプロンプト。200文字以内。' },
          },
          required: ['name', 'description', 'systemPrompt'],
        },
        minItems: 2,
        maxItems: 3,
      },
    },
    required: ['suggestions'],
  },
}
```

**システムプロンプト要点:**
- ユーザーのジャーナルから読み取れる関心・価値観・悩みのパターンに合わせたメンターを提案する
- 既存テンプレート（内省の伴走者・行動の触媒・好奇心の案内人）と被らないユニークなペルソナを生成する
- 日本語で出力する

#### レスポンス Zod スキーマ

```typescript
const MentorSuggestionSchema = z.object({
  name:         z.string(),
  description:  z.string(),
  systemPrompt: z.string(),
})

// 200
export const SuggestResponseSchema = z.object({
  suggestions: z.array(MentorSuggestionSchema).min(2).max(3),
})
export type SuggestResponse = z.infer<typeof SuggestResponseSchema>
```

#### エラー

```
500: Claude API エラー
```

---

## 4. エントリ AI 問いかけ生成

### `POST /api/entries/ask-question`

**概要:** 作成中の下書き本文から内省を深める問いかけを1件生成する。  
エントリ未保存状態で呼び出すため、入力は本文テキストのみ。

**フィーチャーフラグ:** なし（全プラン）  
**認証:** ユーザーセッション必須

#### リクエスト Zod スキーマ

```typescript
export const AskQuestionSchema = z.object({
  content: z.string().min(10).max(20_000),
})
export type AskQuestionInput = z.infer<typeof AskQuestionSchema>
```

#### Claude API 呼び出し仕様

```
モデル: claude-haiku-4-5-20251001
方式: 非ストリーミング（messages API）
```

**システムプロンプト要点:**
- ユーザーの内省を深める、オープンな問いを1つだけ日本語で生成する
- 答えを誘導せず、ユーザー自身が思考・感情に向き合えるような問いにする
- 問いは1〜2文で完結すること

#### レスポンス Zod スキーマ

```typescript
// 200
export const AskQuestionResponseSchema = z.object({
  question: z.string(),
})
export type AskQuestionResponse = z.infer<typeof AskQuestionResponseSchema>
```

---

## 5. Discover レコメンド生成（手動）

### `POST /api/discover/generate`

**概要:** ユーザーが discover_detail の「更新」ボタンを押したときに呼び出す。  
フィルタ条件に合ったレコメンドを5件生成し、`discover_recommendations` に INSERT する。

**フィーチャーフラグ:** `discover`  
**認証:** ユーザーセッション必須

#### リクエスト Zod スキーマ

```typescript
export const DiscoverGenerateSchema = z.object({
  itemTypeId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
})
export type DiscoverGenerateInput = z.infer<typeof DiscoverGenerateSchema>
```

#### 処理フロー

1. `entries` から直近10件の `content` + `tags` を取得
2. `itemTypeId` / `categoryId` から対応する名称を取得
3. `just_for_you` 用プロンプトと `expand` 用プロンプトで計2回 Claude API を呼ぶ
4. 合計5件（内訳は Claude が判断）を `discover_recommendations` に INSERT

#### Claude API 呼び出し仕様

```
モデル: claude-haiku-4-5-20251001
方式: 非ストリーミング（tool_use）
呼び出し回数: 1（just_for_you + expand を1回で生成）
```

**ツール定義:**

```typescript
const GENERATE_DISCOVER_TOOL = {
  name: 'generate_recommendations',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title:        { type: 'string' },
            description:  { type: 'string', description: '推薦理由。2〜3文。' },
            tag:          { type: 'string', enum: ['just_for_you', 'expand'] },
            affiliateUrl: { type: 'string', description: 'URLまたは空文字' },
          },
          required: ['title', 'description', 'tag', 'affiliateUrl'],
        },
        minItems: 5,
        maxItems: 5,
      },
    },
    required: ['items'],
  },
}
```

**プロンプト要点:**
- `just_for_you`: ユーザーのタグ・コンテンツから読み取れる興味に直接マッチするものを推薦
- `expand`: ユーザーがまだ触れていない視点・新しい領域を積極的に提案
- タイプ（商品/場所/体験）とカテゴリ（美術/音楽 等）をフィルタ条件として反映
- フェーズ1は `affiliateUrl` に空文字を返してよい

#### レスポンス Zod スキーマ

```typescript
const RecommendationItemSchema = z.object({
  id:           z.string().uuid(),
  title:        z.string(),
  description:  z.string(),
  tag:          z.enum(['just_for_you', 'expand']),
  affiliateUrl: z.string(),
  imageUrl:     z.string().nullable(),
})

// 200
export const DiscoverGenerateResponseSchema = z.object({
  recommendations: z.array(RecommendationItemSchema).length(5),
})
export type DiscoverGenerateResponse = z.infer<typeof DiscoverGenerateResponseSchema>
```

#### エラー

```
400: バリデーションエラー（itemTypeId / categoryId が不正な UUID）
500: Claude API / DB エラー
```

---

## 6. Cron: Reflection Suggestion バッチ

### `POST /api/cron/reflections`

**概要:** 夜間バッチで全ユーザーの振り返り提案を生成する。  
Vercel Cron が呼び出す。

**認証:** `Authorization: Bearer ${CRON_SECRET}`（Vercel Cron ヘッダー）

#### リクエスト

```
POST /api/cron/reflections
Authorization: Bearer ${CRON_SECRET}
(body なし)
```

#### 処理フロー（ユーザー1人ごと）

1. `reflection_suggestions` の未読件数（`read_at IS NULL`）を確認
2. 未読が3件以上 → スキップ
3. それ未満 → 直近30日の Entry を取得してClaude で生成
4. `reflection_suggestions` に INSERT（上限3件まで補充）

#### Claude API 呼び出し仕様

```
モデル: claude-haiku-4-5-20251001
方式: 非ストリーミング（tool_use）
```

**ツール定義:**

```typescript
const GENERATE_REFLECTION_TOOL = {
  name: 'generate_reflections',
  input_schema: {
    type: 'object',
    properties: {
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: '振り返りを促す問いかけや視点。1〜2文。',
            },
          },
          required: ['content'],
        },
        minItems: 1,
        maxItems: 3,
      },
    },
    required: ['suggestions'],
  },
}
```

**プロンプト要点:**
- 直近のエントリに基づいて、ユーザーが過去の自分を振り返るための問いを生成する
- 「〇〇について、どう感じていましたか？」のようなオープンクエスチョン形式にする
- 日本語で出力する

#### レスポンス

```typescript
// 200
type CronReflectionsResponse = {
  processed: number  // 処理したユーザー数
  generated: number  // 生成した提案の総件数
  skipped:   number  // スキップしたユーザー数
}
```

#### エラー

```
401: CRON_SECRET 不一致
500: DB / Claude API エラー（ユーザー単位でエラーログを残し、他ユーザーは継続）
```

---

## 7. Cron: Discover バッチ

### `POST /api/cron/discover`

**概要:** 夜間バッチで全ユーザーの Discover レコメンドを事前生成する。  
ユーザーごとにデフォルトフィルタ（全タイプ・全カテゴリ）で5件生成する。

**認証:** `Authorization: Bearer ${CRON_SECRET}`

#### リクエスト

```
POST /api/cron/discover
Authorization: Bearer ${CRON_SECRET}
(body なし)
```

#### 処理フロー

1. 全ユーザーの ID を `profiles` から取得
2. ユーザーごとに `POST /api/discover/generate` の内部ロジックを実行（HTTP 呼び出しではなく関数共有）
3. 生成した5件を `discover_recommendations` に INSERT

#### レスポンス

```typescript
// 200
type CronDiscoverResponse = {
  processed: number
  generated: number
  failed:    number
}
```

---

## 付録: ルート一覧

| メソッド | パス | 概要 | 認証 | フラグ |
|---------|------|------|------|-------|
| POST | `/api/entries/[id]/process` | エントリ AI 処理 | ユーザー | `entry_ai_processing` |
| POST | `/api/entries/ask-question` | AI 問いかけ生成 | ユーザー | なし |
| POST | `/api/mentor/[threadId]/messages` | メンターチャット（ストリーミング）| ユーザー | `mentor_chat` |
| POST | `/api/mentor-add/suggest` | メンター候補生成 | ユーザー | なし |
| POST | `/api/discover/generate` | Discover 手動更新 | ユーザー | `discover` |
| POST | `/api/cron/reflections` | 振り返り提案バッチ | Cron | — |
| POST | `/api/cron/discover` | Discover バッチ | Cron | — |

## 付録: Supabase クライアント直接操作（API ルートなし）

以下は全て Supabase クライアントから直接呼び出す。

| 操作 | テーブル |
|------|---------|
| Chain 作成 / 一覧取得 | `chains` |
| エントリ作成 / 取得 / ソフトデリート | `entries` |
| search_vector 全文検索 | `entries` (`.textSearch('search_vector', query)`) |
| プロフィール取得 / 更新 | `profiles` |
| Reflection Suggestion 取得 / 既読更新 | `reflection_suggestions` |
| user_mentors CRUD | `user_mentors` |
| mentor_templates 一覧 | `mentor_templates` |
| mentor_threads 作成 / 取得 | `mentor_threads` |
| mentor_messages 取得 | `mentor_messages` |
| discover_item_types / discover_categories | 各テーブル |
| discover_recommendations 取得 | `discover_recommendations` |
| discover_likes 作成 / 取得 / 削除 | `discover_likes` |
| ai_status 変化の Realtime 購読 | `entries` (Supabase Realtime) |
