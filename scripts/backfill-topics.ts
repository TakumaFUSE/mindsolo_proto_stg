/**
 * Backfill topics and chain_id for existing entries.
 *
 * Usage:
 *   cd scripts
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... ANTHROPIC_API_KEY=... \
 *     npx tsx backfill-topics.ts [--dry-run]
 *
 * What it does:
 *   1. Fetches all entries with empty topics array
 *   2. Calls Claude Haiku to extract topics for each entry
 *   3. Updates the entry's topics column in Supabase
 *   4. Does NOT reassign chain_id (chain_id was set on insert and should be stable)
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')

const EXTRACT_TOPICS_TOOL = {
  name: 'extract_topics',
  description: 'ジャーナルエントリからトピックキーワードを抽出する',
  input_schema: {
    type: 'object' as const,
    properties: {
      topics: {
        type: 'array',
        items: { type: 'string' },
        description: '抽出したトピック。3〜6個。日本語短語。例: ["集中力","朝ルーティン","読書"]',
        minItems: 3,
        maxItems: 6,
      },
    },
    required: ['topics'],
  },
}

async function extractTopics(client: Anthropic, content: string): Promise<string[]> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: `あなたはジャーナルエントリからトピックを抽出するアシスタントです。
内容を代表するキーワードを3〜6個、日本語の短語（2〜8文字）で返してください。
固有名詞・行動・感情・テーマを優先し、汎用すぎる語は避けてください。`,
    tools: [EXTRACT_TOPICS_TOOL],
    tool_choice: { type: 'tool', name: 'extract_topics' },
    messages: [{ role: 'user', content }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') return []
  const input = toolUse.input as { topics?: string[] }
  return Array.isArray(input.topics) ? input.topics : []
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!supabaseUrl || !supabaseKey || !anthropicKey) {
    console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  // Fetch entries with empty topics
  const { data: entries, error } = await supabase
    .from('entries')
    .select('id, content, topics')
    .is('deleted_at', null)
    .eq('topics', '{}')
    .order('created_at', { ascending: true })
    .limit(500)

  if (error) {
    console.error('Failed to fetch entries:', error.message)
    process.exit(1)
  }

  console.log(`Found ${entries?.length ?? 0} entries to backfill. DRY_RUN=${DRY_RUN}`)

  let updated = 0
  let failed = 0

  for (const entry of entries ?? []) {
    try {
      const topics = await extractTopics(anthropic, entry.content)
      console.log(`  [${entry.id}] → ${topics.join(', ')}`)

      if (!DRY_RUN) {
        const { error: updateErr } = await supabase
          .from('entries')
          .update({ topics })
          .eq('id', entry.id)

        if (updateErr) throw updateErr
      }

      updated++
      // Rate-limit: 1 req/sec to avoid Anthropic quota
      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      console.error(`  [${entry.id}] FAILED:`, err)
      failed++
    }
  }

  console.log(`\nDone. updated=${updated}, failed=${failed}`)
}

main()
