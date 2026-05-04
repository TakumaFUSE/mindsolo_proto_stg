import type { CuratedDiscoverItem, DiscoverCategoryGroup } from '@/lib/types'
import { DISCOVER_SYSTEM, DISCOVER_TOOL } from '@/lib/prompts/discover'

const CATEGORY_META: { key: string; label: string; emoji: string }[] = [
  { key: '商品', label: '商品', emoji: '🛍️' },
  { key: '場所', label: '場所', emoji: '📍' },
  { key: '体験', label: '体験', emoji: '✨' },
  { key: '美術', label: '美術', emoji: '🎨' },
  { key: '音楽', label: '音楽', emoji: '🎵' },
  { key: '海外旅行', label: '海外旅行', emoji: '✈️' },
]

type AICategory = {
  key: string
  label: string
  emoji: string
  items: {
    title: string
    description: string
    reason: string
    tags: string[]
  }[]
}

export async function generateRecommendations(
  topics: string[],
): Promise<DiscoverCategoryGroup[]> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const userMessage =
    topics.length > 0
      ? `ユーザーの最近の関心トピック: ${topics.join('、')}`
      : 'ユーザーのトピックデータがまだありません。一般的な内省・自己成長テーマでレコメンドしてください。'

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: DISCOVER_SYSTEM,
    tools: [DISCOVER_TOOL],
    tool_choice: { type: 'tool', name: 'recommend_items' },
    messages: [{ role: 'user', content: userMessage }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('AI did not return tool_use block')
  }

  const input = toolUse.input as { categories: AICategory[] }
  if (!Array.isArray(input.categories)) {
    throw new Error('AI returned unexpected format')
  }

  return input.categories.map((cat, idx) => {
    const meta = CATEGORY_META.find(m => m.key === cat.key) ?? CATEGORY_META[idx] ?? { key: cat.key, label: cat.label, emoji: cat.emoji }
    return {
      key: meta.key,
      label: meta.label,
      emoji: meta.emoji,
      items: cat.items.map((item, itemIdx) => ({
        id: `ai-${meta.key}-${itemIdx}`,
        category_key: meta.key,
        title: item.title,
        description: item.description,
        reason: item.reason,
        image_url: `https://picsum.photos/seed/${encodeURIComponent(item.title)}/400/300`,
        affiliate_url: null,
        tags: item.tags,
      })) satisfies CuratedDiscoverItem[],
    }
  })
}
