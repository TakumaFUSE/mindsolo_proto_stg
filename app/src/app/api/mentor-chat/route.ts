import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getPersonaById } from '@/lib/personas'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

const DEV_REPLY = 'それは興味深いですね。もう少し詳しく教えていただけますか？'

export async function POST(req: Request) {
  const { thread_id, content, persona_id, is_builtin, mentor_id } = await req.json() as {
    thread_id: string
    content: string
    persona_id?: string | null
    is_builtin?: boolean
    mentor_id?: string | null
  }

  // Resolve system prompt
  let systemPrompt =
    'あなたは自己理解を深めるためのメンターです。ユーザーの内省を支援してください。'

  if (is_builtin && persona_id) {
    const persona = getPersonaById(persona_id)
    if (persona) systemPrompt = persona.system_prompt
  } else if (!is_builtin && mentor_id && !DEV_BYPASS) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data } = await supabase
      .from('custom_mentors')
      .select('system_prompt')
      .eq('id', mentor_id)
      .single()
    if (data?.system_prompt) systemPrompt = data.system_prompt
  } else if (!is_builtin && mentor_id && DEV_BYPASS) {
    const { devCustomMentors } = await import('@/lib/dev-store')
    const { FIXTURE_CUSTOM_MENTORS } = await import('@/lib/mocks/mentor-fixtures')
    const mentor =
      devCustomMentors.find(m => m.id === mentor_id) ??
      FIXTURE_CUSTOM_MENTORS.find(m => m.id === mentor_id)
    if (mentor) systemPrompt = mentor.system_prompt
  }

  if (DEV_BYPASS || !process.env.ANTHROPIC_API_KEY) {
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        for (const char of DEV_REPLY) {
          controller.enqueue(enc.encode(char))
          await new Promise(r => setTimeout(r, 30))
        }
        controller.close()
      },
    })

    // Persist message in dev mode (best-effort)
    try {
      const { devMentorMessages } = await import('@/lib/dev-store')
      if (!devMentorMessages[thread_id]) devMentorMessages[thread_id] = []
      const now = new Date().toISOString()
      devMentorMessages[thread_id].push({
        id: `mmsg-${Date.now()}-u`,
        thread_id,
        role: 'user',
        content,
        image_urls: [],
        created_at: now,
      })
      devMentorMessages[thread_id].push({
        id: `mmsg-${Date.now()}-a`,
        thread_id,
        role: 'assistant',
        content: DEV_REPLY,
        image_urls: [],
        created_at: now,
      })
    } catch { /* non-critical */ }

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  // Production: persist user message first
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('unauthorized', { status: 401 })

  await supabase.from('mentor_messages').insert({
    thread_id,
    role: 'user',
    content,
  })

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: systemPrompt,
    prompt: content,
  })

  return result.toTextStreamResponse()
}
