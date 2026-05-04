import type { RelatedEntry } from '@/lib/entry'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

function topicOverlap(a: string[], b: string[]): number {
  const setA = new Set(a)
  return b.filter(t => setA.has(t)).length
}

type ScoredEntry = RelatedEntry & { _score: number }

function pickTop(candidates: ScoredEntry[], limit: number): RelatedEntry[] {
  return candidates
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score: _s, ...e }) => e)
}

async function getRelatedEntriesDev(
  entryId: string,
  chainId: string,
  topics: string[],
): Promise<RelatedEntry[]> {
  await new Promise(r => setTimeout(r, 400)) // simulate latency

  const { devNewEntries } = await import('@/lib/dev-store')
  const { FIXTURE_FEED_ITEMS } = await import('@/lib/mocks/feed-fixtures')

  const allEntries = [
    ...(devNewEntries as Array<{ kind: string; id: string; chain_id: string; summary: string | null; content: string; created_at: string; tags: string[]; topics?: string[] }>),
    ...(FIXTURE_FEED_ITEMS as Array<{ kind: string; id: string; chain_id: string; summary: string | null; content: string; created_at: string; tags: string[]; topics?: string[] }>),
  ].filter(e => e.kind === 'entry' && e.id !== entryId)

  const scored: ScoredEntry[] = allEntries.map(e => ({
    id: e.id,
    summary: e.summary,
    content: e.content,
    created_at: e.created_at,
    tags: e.tags,
    _score: (e.chain_id === chainId ? 10 : 0) + topicOverlap(topics, e.topics ?? []),
  })).filter(e => e._score > 0)

  return pickTop(scored, 3)
}

export async function getRelatedEntries(
  entryId: string,
  chainId: string,
  topics: string[],
  userId: string,
): Promise<RelatedEntry[]> {
  if (DEV_BYPASS) return getRelatedEntriesDev(entryId, chainId, topics)

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data } = await supabase
      .from('entries')
      .select('id, summary, content, created_at, tags, chain_id, topics')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .neq('id', entryId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data?.length) return []

    const scored: ScoredEntry[] = (data as Array<{ id: string; summary: string | null; content: string; created_at: string; tags: string[]; chain_id: string; topics: string[] }>).map(e => ({
      id: e.id,
      summary: e.summary,
      content: e.content,
      created_at: e.created_at,
      tags: e.tags,
      _score: (e.chain_id === chainId ? 10 : 0) + topicOverlap(topics, e.topics ?? []),
    })).filter(e => e._score > 0)

    return pickTop(scored, 3)
  } catch {
    return []
  }
}
