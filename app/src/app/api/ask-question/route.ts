import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

const DEV_QUESTION =
  'その出来事で、あなたが本当に守りたかった価値は何でしたか？'

export async function POST(req: Request) {
  const { content } = await req.json() as { content: string }

  if (DEV_BYPASS || !process.env.ANTHROPIC_API_KEY) {
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        for (const char of DEV_QUESTION) {
          controller.enqueue(enc.encode(char))
          await new Promise(r => setTimeout(r, 28))
        }
        controller.close()
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system:
      'ユーザーの内省を深める、オープンな問いを1つだけ日本語で生成する。' +
      '答えを誘導せず、ユーザー自身が思考・感情に向き合えるような問いにする。' +
      '問いは1〜2文で完結すること。問いだけを返し、説明や前置きは不要。',
    prompt: `以下のジャーナルエントリに対して、内省を深める問いを1つ生成してください。\n\n${content}`,
  })

  return result.toTextStreamResponse()
}
