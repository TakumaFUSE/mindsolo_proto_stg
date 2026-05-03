import { randomUUID } from 'crypto'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

const TOPIC_OVERLAP_THRESHOLD = 2
const LOOKBACK_DAYS = 30
const MAX_PAST_ENTRIES = 50

type EntryRow = {
  id: string
  chain_id: string
  topics: string[]
  created_at: string
}

function overlappingTopics(a: string[], b: string[]): number {
  const setA = new Set(a)
  return b.filter(t => setA.has(t)).length
}

// In dev mode: scan devNewEntries for topic overlap
async function assignChainDev(newTopics: string[]): Promise<string> {
  if (!newTopics.length) return randomUUID()

  const { devNewEntries } = await import('@/lib/dev-store')
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()

  const candidates = (devNewEntries as Array<{ kind: string; chain_id: string; topics?: string[]; created_at: string }>)
    .filter(e => e.kind === 'entry' && e.created_at >= cutoff && Array.isArray(e.topics))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, MAX_PAST_ENTRIES)

  for (const e of candidates) {
    if (overlappingTopics(newTopics, e.topics ?? []) >= TOPIC_OVERLAP_THRESHOLD) {
      return e.chain_id
    }
  }

  return randomUUID()
}

export async function assignChain(userId: string, newTopics: string[]): Promise<string> {
  if (DEV_BYPASS) return assignChainDev(newTopics)

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()

    const { data } = await supabase
      .from('entries')
      .select('id, chain_id, topics, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(MAX_PAST_ENTRIES)

    if (!data?.length || !newTopics.length) {
      // No past entries or no topics → create new chain
      const { data: chain, error } = await supabase
        .from('chains')
        .insert({ user_id: userId })
        .select('id')
        .single()
      if (error || !chain) throw error
      return chain.id
    }

    const rows = data as EntryRow[]
    for (const row of rows) {
      if (overlappingTopics(newTopics, row.topics ?? []) >= TOPIC_OVERLAP_THRESHOLD) {
        return row.chain_id
      }
    }

    // No match → new chain
    const { data: chain, error } = await supabase
      .from('chains')
      .insert({ user_id: userId })
      .select('id')
      .single()
    if (error || !chain) throw error
    return chain.id
  } catch {
    // Fallback: caller will create a new chain the old way
    return ''
  }
}
