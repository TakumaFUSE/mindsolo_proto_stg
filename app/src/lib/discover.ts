import type { CuratedDiscoverItem, DiscoverCategoryGroup } from '@/lib/types'
import {
  FIXTURE_DISCOVER_CATEGORIES,
  FIXTURE_DISCOVER_ITEMS,
} from '@/lib/mocks/discover-fixtures'

export async function getDiscoverTop(): Promise<DiscoverCategoryGroup[]> {
  // Phase 7: replace with AI-personalized recommendations from Supabase
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
