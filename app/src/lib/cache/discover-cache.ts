import type { CuratedDiscoverItem, DiscoverCategoryGroup } from '@/lib/types'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export function topicsHash(topics: string[]): string {
  const input = [...topics].sort().join(',')
  // Simple djb2-style hash — no crypto needed for cache keys
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i)
    h = h >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

export async function getCachedDiscover(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server')['createClient']>>,
  userId: string,
  hash: string,
): Promise<DiscoverCategoryGroup[] | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString()

  const { data } = await supabase
    .from('discover_cache')
    .select('payload, created_at')
    .eq('user_id', userId)
    .eq('topics_hash', hash)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null
  return data.payload as DiscoverCategoryGroup[]
}

export async function setCachedDiscover(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server')['createClient']>>,
  userId: string,
  hash: string,
  payload: DiscoverCategoryGroup[],
): Promise<void> {
  // Evict stale entries for this user before inserting
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString()
  await supabase
    .from('discover_cache')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', cutoff)

  await supabase.from('discover_cache').insert({
    user_id: userId,
    topics_hash: hash,
    payload,
  })
}

export function getDiscoverItemById(
  categories: DiscoverCategoryGroup[],
  id: string,
): CuratedDiscoverItem | null {
  for (const group of categories) {
    const found = group.items.find(item => item.id === id)
    if (found) return found
  }
  return null
}
