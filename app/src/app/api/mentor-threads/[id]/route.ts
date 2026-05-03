import { NextResponse } from 'next/server'

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

  return NextResponse.json({
    thread: threadRes.data,
    messages: messagesRes.data ?? [],
  })
}
