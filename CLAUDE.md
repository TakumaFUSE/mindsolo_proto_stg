# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 現在のフェーズ
- Phase 9: db-cleanup-and-tuning (開始 2026-05-04)

## このリポジトリの方針
- 旧プロト: `legacy/` 参照のみ（コード流用は人が指示したときだけ）
- 新モック: `mock/` がビジュアル正典
- 設計書: `docs/design_spec_pdf/editlife(仮)_設計書.pdf` と `docs/REQUIREMENTS_REVISED.md` が機能正典
- 実装は最終的に `app/` (Next.js 16, App Router) に作る
- 各フェーズの成果は `docs/SPEC.md`, `docs/DATA_MODEL.md`, `docs/IMPL_PLAN.md` に蓄積する

## Repository Layout

```
mindsolo/
├── app/                    # Next.js 16 本体（開発対象）
├── legacy/mindsera_proto/  # 旧プロト・参照のみ。詳細は docs/LEGACY_NOTES.md
├── mock/                   # HTML/CSS モック・ビジュアル正典
├── docs/                   # 設計書・仕様（SPEC.md / DATA_MODEL.md / API_CONTRACTS.md）
├── supabase/migrations/    # SQL マイグレーション
└── .claude/commands/       # phase-start / phase-end スラッシュコマンド
```

## Development Commands

Run from `app/`:

```bash
npm install     # 依存インストール
npm run dev     # 開発サーバー起動 (localhost:3000)
npm run build   # 本番ビルド（型チェック込み）
npm run lint    # ESLint
```

No test suite exists in this project.

## Environment Variables

Create `app/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
CRON_SECRET=
# true にすると Supabase 認証を全スキップ（ローカル開発時）
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
```

## Architecture

### App Router 構成

`app/src/app/` のルートグループ:
- `(auth)/` — login / signup / forgotpassword（認証不要）
- `(app)/` — feed / mentor / journal / discover / setting（認証必須）
- `api/` — Claude API 呼び出しと Cron ジョブのみ。CRUD は Supabase クライアント直接

### 認証・ミドルウェア

`app/src/proxy.ts` が Next.js Middleware として動作:
- `NEXT_PUBLIC_DEV_BYPASS_AUTH=true` のとき全スキップ（ローカル開発用）
- Supabase env 未設定時も同様にスキップ
- 未認証ユーザーを `/login` へリダイレクト

### デザイントークン

`app/src/app/globals.css` に `mock/styles.css` と同名の CSS 変数を定義:
- `:root` に `--bg`, `--ink`, `--brand`, `--brand-2` 等を直定義
- Tailwind v4 `@theme` で shadow / radius 静的値を登録
- Tailwind v4 `@theme inline` で color / font を CSS 変数経由で参照（循環参照回避）
- フォント: `next/font/google` で Manrope + Noto Sans JP をロード → `--font-manrope` → `--font-sans`

### Supabase

- **Auth**: `@supabase/ssr` で Cookie ベース SSR 認証
- **Client**: `app/src/lib/supabase/client.ts` (createBrowserClient) / `server.ts` (async createServerClient)
- **スキーマ**: `supabase/migrations/0001_init.sql`。詳細は `docs/DATA_MODEL.md`
- **RLS**: 全ユーザーデータテーブルに `auth.uid() = user_id` ポリシー適用

### AI Integration

2種の SDK を用途別に使い分ける:
1. **Direct Anthropic SDK** (`@anthropic-ai/sdk`) — 構造化 JSON 出力が必要な処理（`tool_use`）
2. **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) — メンターチャットのストリーミング（`streamText()`）

全 AI ルートで `claude-haiku-4-5-20251001` を使用（コスト効率優先）。

### TypeScript パスエイリアス

`@/*` → `./src/*`。相対パス `../` は使わない。

### 詳細仕様の参照先

| ドキュメント | 内容 |
|------------|------|
| `docs/SPEC.md` | 画面別仕様・機能仕様・受け入れ条件 |
| `docs/DATA_MODEL.md` | ER図・テーブル定義・RLS・インデックス |
| `docs/API_CONTRACTS.md` | 全 API エンドポイントのリクエスト/レスポンス仕様 |

---

## Phase Log

### Phase 1 (material-import) — 2026-05-02
- 達成: legacy proto (Next.js 14) / モック HTML / ワイヤーフレーム PDF / 設計書 PDF をリポジトリに取り込み
- 残課題: モックと設計書で仕様が一致していない箇所が多数
- 次フェーズへの注意: `legacy/` は参照のみ。実装は `app/` に新規作成する
- 成果物: `legacy/`, `mock/`, `docs/wireframes/`, `docs/design_spec_pdf/`

### Phase 2 (spec) — 2026-05-02
- 達成: SPEC.md 確定（13画面・6機能仕様・受け入れ条件）。モック HTML を SPEC.md §3 に合わせて24箇所修正。Playwright で全画面スクリーンショット + compare.html 生成
- 残課題: データモデルと API 仕様が未定義
- 次フェーズへの注意: `docs/SPEC.md` が正典。モックや PDF と矛盾する場合は SPEC.md を優先
- 成果物: `docs/SPEC.md`, `mock/` (24 fixes), `docs/mock_review/`

### Phase 3 (data-model) — 2026-05-02
- 達成: DATA_MODEL.md（ER図・テーブル定義・RLS・インデックス戦略）、API_CONTRACTS.md（全エンドポイント定義）、`supabase/migrations/0001_init.sql`（初期スキーマ）確定。フェーズ自動化コマンド追加
- 残課題: Supabase プロジェクト未作成。ローカル dev は DEV_BYPASS_AUTH で認証をスキップ
- 次フェーズへの注意: CRUD は Supabase クライアント直接。Claude API 呼び出しのみ API Route 経由
- 成果物: `docs/DATA_MODEL.md`, `docs/API_CONTRACTS.md`, `supabase/migrations/0001_init.sql`, `.claude/commands/`

### Phase 4 (auth-scaffold) — 2026-05-02
- 達成: Next.js 16 `app/` スキャフォールド完了。Tailwind v4 `@theme` でデザイントークン定義（mock/styles.css 準拠）。`(auth)` / `(app)` ルートグループ作成。login/signup/forgotpassword UI 実装。BottomNav（5アイテム、write ボタン凸状）付き (app) レイアウト実装
- 残課題: Supabase 実認証未接続（DEV_BYPASS_AUTH で迂回中）。feed/mentor/journal 等は placeholder のみ
- 次フェーズへの注意: `app/.env.local` に `NEXT_PUBLIC_DEV_BYPASS_AUTH=true` が必須。実認証実装時は proxy.ts を修正する
- 成果物: `app/src/app/globals.css`, `app/src/proxy.ts`, `app/src/app/(auth)/`, `app/src/app/(app)/`, `app/src/components/layout/BottomNav.tsx`

### Phase 5 (core-screens) — 2026-05-03 完了
- feed 画面: TimelineChain・SuggestionRail・SearchBar を実装。Chain 末尾 `+` で chain_id 引き継ぎ遷移
- entry_detail 画面: Header / Body / Interpretation / Insight の4セクション。AI フィールドが null のときセクション単位でスケルトン表示（詳細ボタンも非活性）
- entry_write 画面: オートサイズ textarea・画像アップロード・AssistantPromptCard（/api/ask-question ストリーミング）。保存後は /feed ではなく /entry/{id} へ遷移
- dev bypass: devNewEntries を globalThis に退避し API Route → Server Component 間のバンドルチャンク境界を越えて状態共有
- 成果物: `app/src/app/(app)/feed/`, `entry/[id]/`, `entry/write/`, `app/src/app/api/ask-question/`, `api/entries/`, `app/src/components/feed/`, `entry-detail/`, `entry-write/`, `app/src/lib/dev-store.ts`

### Phase 6: mentor-discover (2026-05-03 完了)
- メンター機能: 4種ビルトインペルソナ + カスタムメンター作成、スレッド一覧・チャット画面を実装。AI SDK v6 (useChat + TextStreamChatTransport + streamText) でリアルタイムストリーミング
- DEV_BYPASS では rotating mock replies（devMentorMessages を globalThis で共有）。本番は onFinish で mentor_messages と mentor_threads を Supabase に永続化
- discover 画面: 6カテゴリ（商品/場所/体験/美術/音楽/海外旅行）× 8キュレーションアイテム (48件) のフィクスチャ。CategoryRail / ItemCard / ReasonBlock / AffiliateButton で detail まで実装。Phase 7 で AI 連携予定
- 成果物: `app/src/lib/personas.ts`, `lib/prompts/mentor.ts`, `lib/discover.ts`, `lib/mocks/mentor-fixtures.ts`, `lib/mocks/discover-fixtures.ts`, `app/src/components/mentor/`, `app/src/components/discover/`, `app/src/app/(app)/mentor/`, `app/src/app/(app)/discover/`, `app/src/app/api/mentor/`, `supabase/migrations/0002_mentor.sql`

### Phase 7 (wiring) — 2026-05-04
- 達成: legacy データ移行 (125 件), chain_id 採番 (122/122), AI 生成パイプライン, discover パーソナライズ, setting 画面シェル, login 実認証接続
- 未完: 本番モードで複数バグ発覚 (entry/[id] runtime error, entries INSERT 500, mentor 系の参照ミスマッチ等)。lint/build/README は Phase 8 の締め作業に意図的に先送り
- 次フェーズ: Phase 8 で実データバグ修正と締め (lint/build/README) を実施
- 成果物: `supabase/migrations/0000-0004`, `app/scripts/backfill-existing-entries.ts`, `docs/MIGRATION_PLAN.md`, `app/src/app/(auth)/login/page.tsx`

### Phase 8 (bug-fix-and-polish) — 2026-05-04
- 達成: 本番 DB 監査 SQL (MENTOR_AUDIT.md) + バグトリアージ (RUNTIME_BUG_TRIAGE.md) 作成。確認された全7バグを修正
  - A: ImageCarousel null crash → `imageUrls?.length`
  - C-1: getThreads/getThread で mentor_name/avatar を PERSONAS + custom_mentors バッチ JOIN で解決
  - C-2: StartConversationButton (カスタムメンターから会話開始) 追加
  - C-3a: migration 0005 で `mentor_threads.chain_id` DROP NOT NULL
  - C-3b: migration 0005 で `mentor_threads.mentor_id` FK を `user_mentors` → `custom_mentors` に付け替え
  - C-4: migration 0005 で `custom_mentors.role` DEFAULT 'mentor' + DROP NOT NULL
  - entries id/description: migration 0006 で `entries.id DEFAULT gen_random_uuid()` + `custom_mentors.description DROP NOT NULL`
- 加えて: entries/mentors API ルートに構造化エラーロギング追加、lint 0 errors・build clean を確認
- 残 Tech Debt:
  - `user_mentors` テーブルはスキーマのみ存在・アプリから未使用（最終整理待ち）
  - `mentor_conversations_legacy_archive` / `keyword_saves_legacy_archive` は 2 週間後に削除可
  - entries.chain_id が 3 件 NULL のまま（バックフィル失敗分）
- 次フェーズ候補: Vercel デプロイ設定 / E2E テスト整備
- 成果物: `supabase/migrations/0005-0006`, `docs/RUNTIME_BUG_TRIAGE.md`, `docs/MENTOR_AUDIT.md`, `app/src/components/mentor/StartConversationButton.tsx`

---

## フェーズ運用ルール
- 各フェーズ開始時は /phase-start <番号> <スラッグ> を実行
- 各フェーズ終了時は /phase-end "<一行要約>" を実行
- 手動でブランチを切ったり、CLAUDE.md にフェーズログを書き込んだりしない
- これらの slash command は .claude/commands/ に定義済み
