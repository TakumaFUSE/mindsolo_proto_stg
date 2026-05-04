import { streamText, convertToModelMessages } from 'ai'
import type { UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { buildMentorSystemPrompt } from '@/lib/prompts/mentor'
import { getPersonaById } from '@/lib/personas'
import type { CustomMentor } from '@/lib/types'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

const DEV_REPLIES = [
  'なるほど、そうですか。その経験を通じて、あなたが大切にしていることが少し見えてきますね。もう少し詳しく聞かせてもらえますか？',
  'そこに気づいたこと自体、大切な一歩だと思います。その感覚はいつ頃から感じていましたか？',
  '興味深いですね。その出来事の中で、あなたが特に印象に残っているのはどの部分でしょうか？',
]

let devReplyIndex = 0

function extractText(parts: unknown[]): string {
  return (parts as Array<{ type: string; text?: string }>)
    .filter(p => p.type === 'text')
    .map(p => p.text ?? '')
    .join('')
}

const DEFAULT_SYSTEM =
  'あなたは自己理解を深めるためのメンターです。ユーザーの内省を支援してください。'

export async function POST(req: Request) {
  const { messages, thread_id } = (await req.json()) as {
    messages: Array<{ id: string; role: string; parts: unknown[] }>
    thread_id: string
  }

  if (!thread_id) return new Response('thread_id required', { status: 400 })

  const lastUserMsg = messages[messages.length - 1]
  const userText = lastUserMsg ? extractText(lastUserMsg.parts) : ''

  let systemPrompt = DEFAULT_SYSTEM

  if (DEV_BYPASS) {
    const { devMentorThreads, devMentorMessages } = await import('@/lib/dev-store')
    const { FIXTURE_MENTOR_THREADS, FIXTURE_CUSTOM_MENTORS } = await import(
      '@/lib/mocks/mentor-fixtures'
    )

    const thread =
      devMentorThreads.find(t => t.id === thread_id) ??
      FIXTURE_MENTOR_THREADS.find(t => t.id === thread_id)

    if (thread) {
      if (thread.is_builtin && thread.persona_id) {
        const persona = getPersonaById(thread.persona_id)
        if (persona) systemPrompt = buildMentorSystemPrompt(persona)
      } else if (thread.mentor_id) {
        const { devCustomMentors } = await import('@/lib/dev-store')
        const mentor =
          devCustomMentors.find(m => m.id === thread.mentor_id) ??
          FIXTURE_CUSTOM_MENTORS.find(m => m.id === thread.mentor_id)
        if (mentor) systemPrompt = buildMentorSystemPrompt(mentor)
      }
    }

    const devReply = DEV_REPLIES[devReplyIndex % DEV_REPLIES.length]
    devReplyIndex++

    const now = new Date().toISOString()
    if (!devMentorMessages[thread_id]) devMentorMessages[thread_id] = []
    devMentorMessages[thread_id].push({
      id: `mmsg-${Date.now()}-u`,
      thread_id,
      role: 'user',
      content: userText,
      image_urls: [],
      created_at: now,
    })

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        for (const char of devReply) {
          controller.enqueue(enc.encode(char))
          await new Promise(r => setTimeout(r, 20))
        }
        devMentorMessages[thread_id].push({
          id: `mmsg-${Date.now()}-a`,
          thread_id,
          role: 'assistant',
          content: devReply,
          image_urls: [],
          created_at: new Date().toISOString(),
        })
        const t = devMentorThreads.find(t => t.id === thread_id)
        if (t) {
          t.last_message = devReply
          t.updated_at = new Date().toISOString()
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 500 })
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('unauthorized', { status: 401 })

  const { data: thread } = await supabase
    .from('mentor_threads')
    .select('persona_id, is_builtin, mentor_id')
    .eq('id', thread_id)
    .eq('user_id', user.id)
    .single()

  if (!thread) return new Response('not found', { status: 404 })

  if (thread.is_builtin && thread.persona_id) {
    const persona = getPersonaById(thread.persona_id)
    if (persona) systemPrompt = buildMentorSystemPrompt(persona)
  } else if (thread.mentor_id) {
    const { data: mentor } = await supabase
      .from('custom_mentors')
      .select('system_prompt, tone, name, description')
      .eq('id', thread.mentor_id)
      .single()
    if (mentor) systemPrompt = buildMentorSystemPrompt(mentor as unknown as CustomMentor)
  }

  const modelMessages = await convertToModelMessages(messages as UIMessage[])

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: systemPrompt,
    messages: modelMessages,
    onFinish: async ({ text }) => {
      await supabase.from('mentor_messages').insert([
        { thread_id, role: 'user', content: userText },
        { thread_id, role: 'assistant', content: text },
      ])
      await supabase
        .from('mentor_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', thread_id)
    },
  })

  return result.toTextStreamResponse()
}
