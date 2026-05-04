import type { CuratedDiscoverItem, DiscoverCategoryGroup } from '@/lib/types'
import {
  FIXTURE_DISCOVER_CATEGORIES,
  FIXTURE_DISCOVER_ITEMS,
} from '@/lib/mocks/discover-fixtures'

export async function getDiscoverTop(): Promise<DiscoverCategoryGroup[]> {
  return FIXTURE_DISCOVER_CATEGORIES
}

export async function getDiscoverItem(id: string): Promise<CuratedDiscoverItem | null> {
  return FIXTURE_DISCOVER_ITEMS.find(item => item.id === id) ?? null
}

export function getRelatedItems(item: CuratedDiscoverItem, limit = 3): CuratedDiscoverItem[] {
  return FIXTURE_DISCOVER_ITEMS.filter(
    i => i.category_key === item.category_key && i.id !== item.id,
  ).slice(0, limit)
}

export async function getDiscoverForUser(
  userId: string,
  topics: string[],
): Promise<DiscoverCategoryGroup[]> {
  const { createClient } = await import('@/lib/supabase/server')
  const { topicsHash, getCachedDiscover, setCachedDiscover } = await import(
    '@/lib/cache/discover-cache'
  )
  const { generateRecommendations } = await import('@/lib/discover-ai')

  const supabase = await createClient()
  const hash = topicsHash(topics)

  const cached = await getCachedDiscover(supabase, userId, hash)
  if (cached) return cached

  const categories = await generateRecommendations(topics)
  await setCachedDiscover(supabase, userId, hash, categories)
  return categories
}

export async function getDiscoverItemForUser(
  id: string,
  userId: string,
  topics: string[],
): Promise<CuratedDiscoverItem | null> {
  // Fixture items first
  const fixture = FIXTURE_DISCOVER_ITEMS.find(item => item.id === id)
  if (fixture) return fixture

  // For AI-generated IDs, load user's cached categories and search
  if (!id.startsWith('ai-')) return null

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const { topicsHash, getCachedDiscover } = await import('@/lib/cache/discover-cache')
    const { getDiscoverItemById } = await import('@/lib/cache/discover-cache')

    const supabase = await createClient()
    const hash = topicsHash(topics)
    const cached = await getCachedDiscover(supabase, userId, hash)
    if (!cached) return null
    return getDiscoverItemById(cached, id)
  } catch {
    return null
  }
}
