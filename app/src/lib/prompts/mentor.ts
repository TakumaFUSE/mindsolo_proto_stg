import type { MentorPersona } from '@/lib/personas'
import type { CustomMentor } from '@/lib/types'

const STYLE_GUIDE = `

【スタイルガイド】
- 返答は日本語のみ
- 1回の返答は 2〜5 文程度に収める
- 内省・自己理解を深めることを最優先とする
- 断定より「探索」を優先し、解釈を押しつけない
- 返答の末尾はオープンな問いで締めることが多い`

export function buildMentorSystemPrompt(
  source: MentorPersona | CustomMentor,
  journalContext?: string,
): string {
  const base =
    'system_prompt' in source
      ? (source as CustomMentor).system_prompt
      : (source as MentorPersona).system_prompt

  const full = base + STYLE_GUIDE

  return journalContext
    ? `${full}\n\n---\n## ユーザーの関連ジャーナル\n${journalContext}`
    : full
}
