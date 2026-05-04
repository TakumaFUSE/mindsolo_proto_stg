# editlife (Mindsolo)

> Phase 0–8 complete — production bugs fixed, lint clean, ready for deploy.

日々の出来事・感情・思考・興味関心を記録し、AI が解釈・接続・振り返り・次の行動提案へつなげる、**自己理解と探索のためのパーソナルストックツール**。

---

## スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router, Turbopack) |
| UI | Tailwind CSS v4, Manrope + Noto Sans JP |
| 認証・DB | Supabase (Auth + Postgres + Storage) |
| AI | Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) |
| AI SDK | Direct `@anthropic-ai/sdk` (構造化出力) + Vercel AI SDK (ストリーミング) |

---

## ディレクトリ構成

```
mindsolo/
├── app/                    # Next.js 16 本体（開発対象）
│   ├── src/app/            # App Router ルート
│   │   ├── (auth)/         # login / signup / forgotpassword
│   │   ├── (app)/          # feed / entry / mentor / discover / setting
│   │   └── api/            # Claude API ルート + Cron
│   ├── src/components/     # UI コンポーネント
│   └── src/lib/            # ビジネスロジック・型定義・モック
├── legacy/                 # 旧プロト（参照のみ）
├── mock/                   # HTML/CSS モック（ビジュアル正典）
├── docs/                   # 設計書・仕様・スクリーンショット
└── supabase/migrations/    # SQL マイグレーション
```

---

## ローカル起動

```bash
cd app
npm install
npm run dev     # http://localhost:3000
```

### 環境変数

`app/.env.local` を作成:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
CRON_SECRET=
# Supabase 認証をスキップしてローカル開発（デフォルト true）
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
```

`NEXT_PUBLIC_DEV_BYPASS_AUTH=true` の場合は Supabase 未設定でも全画面が動作します（フィクスチャデータを使用）。

### その他コマンド

```bash
npm run build   # 本番ビルド（型チェック込み）
npm run lint    # ESLint（エラー 0 が基準）
```

---

## Supabase セットアップ（本番接続時）

```bash
# Supabase CLI でリンクしてから全 migration を一括適用
supabase link --project-ref <your-project-ref>
supabase db push
```

現在の migration スタック（適用順）:

```
0000_legacy_reconcile   journal_entries → entries リネーム + カラム追加
0001_init               新規テーブル全作成 (chains / mentor_threads / etc.)
0002_mentor             custom_mentors + persona columns + legacy data migration
0003_topics_chain       entries.topics column + index
0004_discover_cache     discover_cache table
0005_bug_fixes          mentor_threads.chain_id DROP NOT NULL / custom_mentors.role DEFAULT
0006_schema_fixes       entries.id DEFAULT gen_random_uuid() / description DROP NOT NULL
```

---

## フェーズ運用

フェーズの開始・終了は `.claude/commands/` に定義されたスラッシュコマンドで管理します。

```
/phase-start <番号> <スラッグ>   # 新フェーズブランチ作成 + CLAUDE.md 更新
/phase-end   "<一行要約>"        # Phase Log 追記 + main マージ確認
```

詳細は `CLAUDE.md` の Phase Log を参照してください。

---

## 主要ドキュメント

| ドキュメント | 内容 |
|------------|------|
| `docs/SPEC.md` | 画面別仕様・機能仕様・受け入れ条件 |
| `docs/DATA_MODEL.md` | ER図・テーブル定義・RLS・インデックス |
| `docs/API_CONTRACTS.md` | 全 API エンドポイント仕様 |
| `docs/MOCK_AUDIT.md` | モック vs 実装の差分レポート |
| `docs/mock_review/` | フェーズ別スクリーンショット |
