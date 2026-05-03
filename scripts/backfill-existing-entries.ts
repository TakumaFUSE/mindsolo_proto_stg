#!/usr/bin/env tsx
/**
 * Backfill topics and chain_id for existing entries that have neither.
 *
 * Usage:
 *   cd scripts
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ANTHROPIC_API_KEY=... \
 *     npx tsx backfill-existing-entries.ts [--dry-run]
 *
 * Flags:
 *   --dry-run   Print what would change without writing to DB
 *
 * Requires:
 *   npm install -g tsx   (or: npx tsx ...)
 *   @supabase/supabase-js   @anthropic-ai/sdk
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 50
const PARALLEL = 3
const TOPIC_OVERLAP_THRESHOLD = 2
const LOOKBACK_DAYS = 30

// ── Env validation ─────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SERVICE_KEY || !ANTHROPIC_KEY) {
  console.error(
    'Missing required env vars:\n' +
    '  NEXT_PUBLIC_SUPABASE_URL\n' +
    '  SUPABASE_SERVICE_ROLE_KEY\n' +
    '  ANTHROPIC_API_KEY'
  )
  process.exit(1)
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

// ── Types ──────────────────────────────────────────────────────────────────

type EntryRow = {
  id: string
  user_id: string
  content: string
  topics: string[]
  chain_id: string | null
  created_at: string
}

// ── Topic extraction ───────────────────────────────────────────────────────

const SYSTEM = `あなたはジャーナルエントリからトピックを抽出するアシスタントです。
ユーザーが記録した文章から、内容を代表するキーワード（トピック）を抽出してください。

【ルール】
- 3〜6個のトピックを返す
- 各トピックは日本語の短語（2〜8文字）
- 固有名詞・行動・感情・テーマを優先
- 汎用すぎる語（「こと」「もの」「など」）は使わない
- 日本語のみ出力する`

const TOPICS_TOOL = {
  name: 'extract_topics',
  description: 'ジャーナルエントリからトピックキーワードを抽出する',
  input_schema: {
    type: 'object' as const,
    properties: {
      topics: {
        type: 'array',
        items: { type: 'string' },
        description: '抽出したトピック。3〜6個。日本語短語。',
        minItems: 3,
        maxItems: 6,
      },
    },
    required: ['topics'],
  },
}

async function extractTopics(content: string): Promise<string[]> {
  if (!content.trim()) return []
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: SYSTEM,
    tools: [TOPICS_TOOL],
    tool_choice: { type: 'tool', name: 'extract_topics' },
    messages: [{ role: 'user', content }],
  })
  const block = res.content.find(b => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') return []
  const input = block.input as { topics?: string[] }
  return Array.isArray(input.topics) ? input.topics : []
}

// ── Chain assignment ───────────────────────────────────────────────────────

function overlappingTopics(a: string[], b: string[]): number {
  const setA = new Set(a)
  return b.filter(t => setA.has(t)).length
}

async function assignChain(
  userId: string,
  newTopics: string[],
  cutoff: string
): Promise<string> {
  if (!newTopics.length) {
    // No topics → create a new chain
    const { data, error } = await supabase
      .from('chains')
      .insert({ user_id: userId })
      .select('id')
      .single()
    if (error || !data) throw new Error(`chain insert: ${error?.message}`)
    return data.id
  }

  const { data: rows } = await supabase
    .from('entries')
    .select('id, chain_id, topics, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('chain_id', 'is', null)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(50)

  for (const row of rows ?? []) {
    const entry = row as EntryRow
    if (
      entry.chain_id &&
      overlappingTopics(newTopics, entry.topics ?? []) >= TOPIC_OVERLAP_THRESHOLD
    ) {
      return entry.chain_id
    }
  }

  // No matching chain → create new one
  const { data, error } = await supabase
    .from('chains')
    .insert({ user_id: userId })
    .select('id')
    .single()
  if (error || !data) throw new Error(`chain insert: ${error?.message}`)
  return data.id
}

// ── Main ───────────────────────────────────────────────────────────────────

async function processEntry(
  entry: EntryRow,
  cutoff: string,
  stats: { ok: number; skipped: number; failed: number }
): Promise<void> {
  const needsTopics = !entry.topics?.length
  const needsChain  = !entry.chain_id

  if (!needsTopics && !needsChain) {
    stats.skipped++
    return
  }

  try {
    let topics = entry.topics ?? []
    if (needsTopics) {
      topics = await extractTopics(entry.content)
    }

    let chainId = entry.chain_id
    if (needsChain) {
      chainId = await assignChain(entry.user_id, topics, cutoff)
    }

    if (DRY_RUN) {
      console.log(
        `  [dry-run] ${entry.id.slice(0, 8)} topics=${JSON.stringify(topics)} chain=${chainId?.slice(0, 8)}`
      )
      stats.ok++
      return
    }

    const patch: Partial<EntryRow> & { topics?: string[]; chain_id?: string } = {}
    if (needsTopics) patch.topics = topics
    if (needsChain)  patch.chain_id = chainId ?? undefined

    const { error } = await supabase
      .from('entries')
      .update(patch)
      .eq('id', entry.id)

    if (error) throw new Error(error.message)

    stats.ok++
    process.stdout.write('.')
  } catch (err) {
    stats.failed++
    console.error(`\n  [error] ${entry.id}: ${(err as Error).message}`)
  }
}

async function main() {
  console.log(`Backfill starting${DRY_RUN ? ' (DRY RUN)' : ''}…`)

  let offset = 0
  const stats = { ok: 0, skipped: 0, failed: 0 }
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()

  while (true) {
    const { data: rows, error } = await supabase
      .from('entries')
      .select('id, user_id, content, topics, chain_id, created_at')
      .is('deleted_at', null)
      .or('chain_id.is.null,topics.eq.{}')
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) {
      console.error('Fetch error:', error.message)
      process.exit(1)
    }

    const entries = (rows ?? []) as EntryRow[]
    if (!entries.length) break

    console.log(`\nBatch offset=${offset} size=${entries.length}`)

    // Process in parallel groups of PARALLEL
    for (let i = 0; i < entries.length; i += PARALLEL) {
      const chunk = entries.slice(i, i + PARALLEL)
      await Promise.all(chunk.map(e => processEntry(e, cutoff, stats)))
    }

    offset += BATCH_SIZE
    if (entries.length < BATCH_SIZE) break
  }

  console.log('\n\nDone.')
  console.log(`  ok:      ${stats.ok}`)
  console.log(`  skipped: ${stats.skipped}`)
  console.log(`  failed:  ${stats.failed}`)

  if (stats.failed > 0) process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
