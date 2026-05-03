import { EXTRACT_TOPICS_SYSTEM, EXTRACT_TOPICS_TOOL } from '@/lib/prompts/extract-topics'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

// Simple heuristic for dev mode: split on common delimiters and take noun-like tokens
function devExtractTopics(body: string): string[] {
  const tokens = body
    .replace(/[。、！？\n]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2 && t.length <= 10)
    // Prefer tokens that look like nouns (don't end in verb endings)
    .filter(t => !/[するためにたてにはがをで]$/.test(t))

  const unique = [...new Set(tokens)]
  // Return 3 tokens, padding with generic fallbacks if needed
  const result = unique.slice(0, 3)
  while (result.length < 3) result.push(['日常', '記録', '振り返り'][result.length])
  return result
}

export async function extractTopics(body: string): Promise<string[]> {
  if (!body.trim()) return []

  if (DEV_BYPASS) return devExtractTopics(body)

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic()

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: EXTRACT_TOPICS_SYSTEM,
      tools: [EXTRACT_TOPICS_TOOL],
      tool_choice: { type: 'tool', name: 'extract_topics' },
      messages: [{ role: 'user', content: body }],
    })

    const toolUse = response.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') return []
    const input = toolUse.input as { topics?: string[] }
    return Array.isArray(input.topics) ? input.topics : []
  } catch {
    // Fail silently — entry save must not be blocked by AI error
    return []
  }
}
