# editlife Legacy Notes (LEGACY_NOTES.md)

> `legacy/mindsera_proto/` (旧プロトタイプ) の技術メモ。
> 新実装 (`app/`) の開発には参照不要。コード流用は人が明示したときのみ。

---

## アーキテクチャ概要

旧プロトは Next.js 14 App Router + Supabase + Zustand。

---

## State Management

`src/lib/store.ts`: Zustand でジャーナルエントリを管理。

楽観的ローカル更新 → 非同期 Supabase 書き込み (fire-and-forget IIFE):
- 状態は同期的に更新してUI即時反映
- DB 書き込みエラーはコンソールのみ。UI には反映しない

---

## AI Integration

2種の SDK が混在:

1. **Direct Anthropic SDK** (`@anthropic-ai/sdk`) — `/api/analyze` で `tool_use` structured output（感情分析）
2. **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) — `/api/mentor` で `streamText()` ストリーミング

---

## Mentor Persona System

4種のビルトインペルソナ:
- 定義: `src/lib/personas.ts`
- システムプロンプト: `src/lib/prompts/personas.ts`
- Plutchik 感情モデルに基づきペルソナ自動選択 (`getMentorMessage()` 内のマッピング)

カスタムメンター: Supabase `custom_mentors` テーブルに保存し、`customSystemPrompt` フィールドで API に渡す。

---

## Supabase スキーマ（旧プロト固有）

`journal_entries` テーブルの追加カラム（手動マイグレーション必須）:

```sql
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_label text,
  ADD COLUMN IF NOT EXISTS topics text[],
  ADD COLUMN IF NOT EXISTS keyword_matrix jsonb;
```

`custom_mentors` テーブルのスキーマは `legacy/mindsera_proto/src/app/(app)/mentor/page.tsx` を参照。

---

## Prompt Engineering

- 全プロンプトとツール定義: `src/lib/prompts/`
- `EMOTION_ANALYSIS_TOOL` (`analyze.ts`) と `EmotionAnalysis` interface (`types.ts`) は必ず同期して変更すること。どちらか一方を変えると構造化出力のパースが壊れる

---

## Path Aliases

TypeScript: `@/*` → `./src/*`（新実装 `app/` でも同じ規約を踏襲）
