import type { FeedItem, ReflectionSuggestion } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type FeedGroup = {
  chainId: string
  items: FeedItem[]   // sorted by created_at ASC
  latestAt: string    // max created_at — used to sort groups DESC
}

export function groupFeedItems(items: FeedItem[]): FeedGroup[] {
  const map = new Map<string, FeedItem[]>()
  for (const item of items) {
    if (!map.has(item.chain_id)) map.set(item.chain_id, [])
    map.get(item.chain_id)!.push(item)
  }

  const groups: FeedGroup[] = []
  for (const [chainId, chainItems] of map) {
    chainItems.sort((a, b) => a.created_at.localeCompare(b.created_at))
    const latestAt = chainItems[chainItems.length - 1].created_at
    groups.push({ chainId, items: chainItems, latestAt })
  }

  return groups.sort((a, b) => b.latestAt.localeCompare(a.latestAt))
}

export async function getFeedItems(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ groups: FeedGroup[]; suggestions: ReflectionSuggestion[] }> {
  const [entriesRes, threadsRes, suggestionsRes] = await Promise.all([
    supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('mentor_threads')
      .select('id, user_id, chain_id, mentor_id, title, created_at, updated_at, user_mentors(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('reflection_suggestions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const entries: FeedItem[] = (entriesRes.data ?? []).map(e => ({
    ...e,
    kind: 'entry' as const,
  }))

  const threads: FeedItem[] = (threadsRes.data ?? []).map(t => ({
    ...t,
    kind: 'thread' as const,
    mentor_name:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((t.user_mentors as any)?.name as string | undefined) ?? '不明なメンター',
  }))

  return {
    groups: groupFeedItems([...entries, ...threads]),
    suggestions: suggestionsRes.data ?? [],
  }
}
