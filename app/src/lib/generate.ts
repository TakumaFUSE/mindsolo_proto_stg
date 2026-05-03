import { SUMMARY_SYSTEM } from '@/lib/prompts/summary'
import { INTERPRETATION_SYSTEM } from '@/lib/prompts/interpretation'
import { INSIGHT_SYSTEM } from '@/lib/prompts/insight'

async function callClaude(system: string, content: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system,
    messages: [{ role: 'user', content }],
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text.trim() : ''
}

export function generateSummary(content: string): Promise<string> {
  return callClaude(SUMMARY_SYSTEM, content)
}

export function generateInterpretation(content: string): Promise<string> {
  return callClaude(INTERPRETATION_SYSTEM, content)
}

export function generateInsight(content: string, topics: string[]): Promise<string> {
  const input = topics.length
    ? `${content}\n\n【このエントリのキーワード: ${topics.join('、')}】`
    : content
  return callClaude(INSIGHT_SYSTEM, input)
}

// Dev mock: staggered fake responses
function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

export async function devGenerateSummary(content: string): Promise<string> {
  await delay(600)
  return `${content.slice(0, 35).trim()}…という記録。自己観察の一場面として印象的です。`
}

export async function devGenerateInterpretation(_content: string): Promise<string> {
  await delay(900)
  return `この記録から、あなたが「行動の質」に敏感であることが伝わります。特定の条件が整ったときに集中しやすい傾向があるかもしれません。自分のペースや環境への気づきを大切にしている姿勢が見えます。`
}

export async function devGenerateInsight(topics: string[]): Promise<string> {
  await delay(1200)
  const keyword = topics[0] ?? '記録'
  return `「${keyword}」に関連して、過去の自分と比較してみるのも良いかもしれません。この気づきを明日の行動に1つだけ結びつけるとしたら、何が思い浮かびますか？`
}
