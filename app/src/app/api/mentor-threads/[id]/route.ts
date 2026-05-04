import { NextResponse } from 'next/server'
import { getPersonaById } from '@/lib/personas'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (DEV_BYPASS) {
    const { devMentorThreads, devMentorMessages } = await import('@/lib/dev-store')
    const { FIXTURE_MENTOR_THREADS, FIXTURE_MENTOR_MESSAGES } = await import(
      '@/lib/mocks/mentor-fixtures'
    )

    const thread =
      devMentorThreads.find(t => t.id === id) ??
      FIXTURE_MENTOR_THREADS.find(t => t.id === id) ??
      null

    if (!thread) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const messages =
      devMentorMessages[id] ?? FIXTURE_MENTOR_MESSAGES[id] ?? []

    return NextResponse.json({ thread, messages })
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [threadRes, messagesRes] = await Promise.all([
    supabase.from('mentor_threads').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase
      .from('mentor_messages')
      .select('*')
      .eq('thread_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (threadRes.error || !threadRes.data)
    return NextResponse.json({ error: 'not found' }, { status: 404 })

  const raw = threadRes.data as {
    is_builtin: boolean
    persona_id: string | null
    mentor_id: string | null
  }

  // Resolve mentor_name / mentor_avatar
  let mentor_name = 'メンター'
  let mentor_avatar = 'M'

  if (raw.is_builtin && raw.persona_id) {
    const persona = getPersonaById(raw.persona_id)
    if (persona) {
      mentor_name = persona.name
      mentor_avatar = persona.avatar
    } else {
      // persona_id is a UUID → legacy custom mentor stored as builtin
      const { data: cm } = await supabase
        .from('custom_mentors')
        .select('name')
        .eq('id', raw.persona_id)
        .single()
      if (cm) {
        mentor_name = cm.name
        mentor_avatar = cm.name.charAt(0)
      }
    }
  } else if (!raw.is_builtin && raw.mentor_id) {
    const { data: cm } = await supabase
      .from('custom_mentors')
      .select('name')
      .eq('id', raw.mentor_id)
      .single()
    if (cm) {
      mentor_name = cm.name
      mentor_avatar = cm.name.charAt(0)
    }
  }

  return NextResponse.json({
    thread: { ...threadRes.data, mentor_name, mentor_avatar, last_message: null },
    messages: messagesRes.data ?? [],
  })
}
