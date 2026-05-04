#!/usr/bin/env tsx
/**
 * Backfill topics and chain_id for existing entries.
 *
 * Usage (run from the app/ directory):
 *   cd app
 *   npx tsx scripts/backfill-existing-entries.ts [--dry-run] [--chain-only]
 *
 * Flags:
 *   --dry-run     Print what would change without writing to DB
 *   --chain-only  Skip topic extraction entirely; use existing topics as-is
 *                 and only assign chain_id. ANTHROPIC_API_KEY not required.
 *                 Use this when topics are already populated (e.g. topics_null=0).
 *
 * Env vars (loaded automatically from app/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL   Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  Service role key (bypasses RLS) — add to .env.local
 *   ANTHROPIC_API_KEY          Required unless --chain-only is set
 *
 * Note: @/lib/chain is not imported here because lib/chain.ts references
 * next/headers (Server Component context) which is unavailable outside Next.js.
 * Chain assignment logic is duplicated inline.
 */

// Static imports — only non-app modules here so dotenv runs before app modules
// are loaded (app modules evaluate module-level const DEV_BYPASS at load time).
import { resolve } from 'path'
import { config } from 'dotenv'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const DRY_RUN    = process.argv.includes('--dry-run')
const CHAIN_ONLY = process.argv.includes('--chain-only')
const BATCH_SIZE = 50
const PARALLEL   = 3
const TOPIC_OVERLAP_THRESHOLD = 2
const LOOKBACK_DAYS = 30

// Load .env.local before validating env vars
// dotenv does not override already-set env vars (safe to run in CI with explicit vars)
config({ path: resolve('.env.local') })

// Always use the real API regardless of DEV_BYPASS in .env.local
// (must be set before @/lib/topics is dynamically imported)
process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH = 'false'

// ── Env validation ──────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing required env vars:\n' +
    '  NEXT_PUBLIC_SUPABASE_URL    (set in .env.local or environment)\n' +
    '  SUPABASE_SERVICE_ROLE_KEY   (add to .env.local — never commit this key!)'
  )
  process.exit(1)
}

if (!CHAIN_ONLY && !ANTHROPIC_KEY) {
  console.error(
    'Missing required env var:\n' +
    '  ANTHROPIC_API_KEY\n' +
    '(use --chain-only to skip topic extraction and omit this key)'
  )
  process.exit(1)
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ── Types ───────────────────────────────────────────────────────────────────

type EntryRow = {
  id: string
  user_id: string
  content: string
  topics: string[]
  chain_id: string | null
  created_at: string
}

// ── Topic extraction (delegates to @/lib/topics) ────────────────────────────

// Dynamic import so @/lib/topics is loaded after env vars and DEV_BYPASS override
// are in effect. Node.js caches the module after first load.
async function extractTopics(content: string): Promise<string[]> {
  const { extractTopics: _extract } = await import('@/lib/topics')
  return _extract(content)
}

// ── Chain assignment (inline — lib/chain.ts uses next/headers) ──────────────

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

  const { data, error } = await supabase
    .from('chains')
    .insert({ user_id: userId })
    .select('id')
    .single()
  if (error || !data) throw new Error(`chain insert: ${error?.message}`)
  return data.id
}

// ── Main ────────────────────────────────────────────────────────────────────

async function processEntry(
  entry: EntryRow,
  cutoff: string,
  stats: { ok: number; skipped: number; failed: number }
): Promise<void> {
  const needsTopics = !CHAIN_ONLY && !entry.topics?.length
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

    const patch: Record<string, unknown> = {}
    if (needsTopics) patch.topics   = topics
    if (needsChain)  patch.chain_id = chainId

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
  const modeLabel = [
    DRY_RUN    ? 'DRY RUN'    : '',
    CHAIN_ONLY ? 'CHAIN ONLY' : '',
  ].filter(Boolean).join(', ')
  console.log(`Backfill starting${modeLabel ? ` (${modeLabel})` : ''}…`)

  let offset = 0
  const stats  = { ok: 0, skipped: 0, failed: 0 }
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()

  const filterExpr = CHAIN_ONLY ? 'chain_id.is.null' : 'chain_id.is.null,topics.eq.{}'

  while (true) {
    const { data: rows, error } = await supabase
      .from('entries')
      .select('id, user_id, content, topics, chain_id, created_at')
      .is('deleted_at', null)
      .or(filterExpr)
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) {
      console.error('Fetch error:', error.message)
      process.exit(1)
    }

    const entries = (rows ?? []) as EntryRow[]
    if (!entries.length) break

    console.log(`\nBatch offset=${offset} size=${entries.length}`)

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
