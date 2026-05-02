# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## このリポジトリの方針
- 旧プロト: `legacy/` 参照のみ（コード流用は人が指示したときだけ）
- 新モック: `mock/` がビジュアル正典
- 設計書: `docs/design_spec_pdf/editlife(仮)_設計書.pdf` と `docs/REQUIREMENTS_REVISED.md` が機能正典
- 実装は最終的に `app/` (Next.js 16, App Router) に作る
- 各フェーズの成果は `docs/SPEC.md`, `docs/DATA_MODEL.md`, `docs/IMPL_PLAN.md` に蓄積する

## Repository Layout

```
mindsolo/
├── legacy/mindsera_proto/   # Next.js app (the main codebase)
├── mock/                    # Static HTML/CSS/JS UI prototype (reference only)
└── docs/                    # Wireframes and Japanese design spec PDFs
```

Active development happens in `legacy/mindsera_proto/`. The `mock/` directory is a static prototype for UI/UX reference — it is not served by the Next.js app.

## Development Commands

Run from `legacy/mindsera_proto/`:

```bash
npm run dev     # Start dev server
npm run build   # Production build
npm run lint    # Run ESLint
```

No test suite exists in this project.

## Environment Variables

Create `legacy/mindsera_proto/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

## Architecture

### Next.js Version Warning

This project uses **Next.js 16** which has breaking changes from earlier versions. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`. APIs, conventions, and file structure may differ from training data.

### App Structure

Route groups under `src/app/`:
- `(auth)/` — login, signup (unauthenticated)
- `(app)/` — dashboard, journal/new, journal/[id], insights, mentor (requires auth)
- `api/` — server-side API routes for all AI operations

Auth routing is handled by `src/proxy.ts` (Next.js middleware), which redirects unauthenticated users to `/login`.

### State Management

`src/lib/store.ts` uses Zustand as the single source of truth for journal entries. The store performs **optimistic local updates then async Supabase writes** — state is updated synchronously, and database writes happen in fire-and-forget async IIFEs. This means UI feels instant but sync errors are only logged to console.

### AI Integration — Two Different Patterns

The codebase uses two separate SDK approaches for different purposes:

1. **Direct Anthropic SDK** (`@anthropic-ai/sdk`) — used in `/api/analyze` for structured `tool_use` responses with JSON output (emotion analysis)
2. **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) — used in `/api/mentor` for streaming text via `streamText()` with `result.toTextStreamResponse()`

All Claude calls use `claude-haiku-4-5-20251001`. Do not switch models without considering cost implications.

### Mentor Persona System

Four built-in personas are defined in `src/lib/personas.ts` with system prompts in `src/lib/prompts/personas.ts`. Personas are automatically selected based on the dominant Plutchik emotion from the last journal entry (mapping in `getMentorMessage()`). Custom mentors created by users are stored in Supabase's `custom_mentors` table and passed via `customSystemPrompt` in the API request body.

### Supabase Schema Requirements

The `journal_entries` table requires additional columns beyond the default scaffold. These migrations must be run manually:

```sql
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_label text,
  ADD COLUMN IF NOT EXISTS topics text[],
  ADD COLUMN IF NOT EXISTS keyword_matrix jsonb;
```

The `custom_mentors` table must also be created with appropriate RLS policies (see `src/app/(app)/mentor/page.tsx` for the expected schema).

### Prompt Engineering

All system prompts and tool definitions live in `src/lib/prompts/`. The emotion analysis tool definition (`EMOTION_ANALYSIS_TOOL` in `src/lib/prompts/analyze.ts`) must match the `EmotionAnalysis` interface in `src/lib/types.ts` — changing either without updating the other will break structured output parsing.

### Path Aliases

TypeScript path alias `@/*` maps to `./src/*`. Always use `@/` imports, never relative `../` traversal.

## フェーズ運用ルール
- 各フェーズ開始時は /phase-start <番号> <スラッグ> を実行
- 各フェーズ終了時は /phase-end "<一行要約>" を実行
- 手動でブランチを切ったり、CLAUDE.md にフェーズログを書き込んだりしない
- これらの slash command は .claude/commands/ に定義済み
